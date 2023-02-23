const {execSync, exec} = require('child_process');


function mjrToMp4(mjr, outputVideo) {
    console.log('mjrToMp4', mjr);
    let cmd = `janus-pp-rec  ${mjr} ${outputVideo}`
    execSync(cmd);
}

function mjrToOpus(mjr, outputAudio) {
    console.log('mjrToOpus', mjr);
    let cmd = `janus-pp-rec  ${mjr} ${outputAudio}`
    execSync(cmd);
}

function mergeAudioAndVideo(inputVideo, inputAudio, outputVideo) {
    console.log('mergeAudioAndVideo', inputAudio, inputAudio, outputVideo)
    let cmd = `ffmpeg -i ${inputVideo} -i ${inputAudio} -c:v copy -c:a aac ${outputVideo}`
    execSync(cmd)
}


function padEnd(inputVideo, duration, outVideo) {
    console.log('padEnd', inputVideo, outVideo, duration);
    let cmd = `ffmpeg -i ${inputVideo} -filter_complex "[0:v]tpad=stop_duration=${duration}[v];[0:a]apad=pad_dur=${duration}[a]" -map "[v]" -map "[a]" ${outVideo}`
    return execSync(cmd);
}

function padStart(inputVideo, duration, outVideo) {
    duration = Math.round(duration);
    console.log('padStart', inputVideo, outVideo, duration);
    let tmpFile = inputVideo + '.mp4';
    let padCmd = `ffmpeg -i ${inputVideo} -video_track_timescale 90k -filter_complex "tpad=start_duration=${duration}" ${tmpFile} `;
    execSync(padCmd);
    let delayCmd = `ffmpeg -i ${tmpFile} -itsoffset ${duration} -i ${tmpFile} -map 0:v -map 1:a -c copy ${outVideo}`;
    execSync(delayCmd);
    execSync(`rm -f ${tmpFile}`);

    // // test
    // let cmd = `ffmpeg -i ${inputVideo} -filter_complex "[0:v]tpad=start_duration=${duration}[v];[0:a]adelay=${duration}[a]" -map "[v]" -map "[a]" ${outVideo}`;
    // execSync(cmd);

}

function concat(outputVideo, ...videos) {
    if (videos.length < 1) {
        return;
    }
    console.log('concat', outputVideo, videos);
    let cf = '';
    videos.forEach(video => {
        cf += `file ${video} \n`
        // cf += `duration ${duration(video)} \n`
    })
    execSync(`echo "${cf}" > list.txt`);
    //let concatCmd = `ffmpeg -f concat -i list.txt -c:v copy -c:a copy ${outputVideo}`
    let concatCmd = `ffmpeg -f concat -i list.txt -c:v h264 -c:a aac ${outputVideo}`
    execSync(concatCmd);
    execSync(`rm -f list.txt`);
}

function duration(inputVideo) {
    let cmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${inputVideo}`;
    let stdout = execSync(cmd);
    console.log('duration: ', inputVideo, stdout.toString());
    return stdout.toString();
}

function resolution(inputVideo) {
    let cmd = `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 ${inputVideo}`
    let stdout = execSync(cmd);
    console.log('resolution: ', inputVideo, stdout.toString());
    return stdout.toString();
}

function maxDuration(...videos) {
    let md = 0;
    videos.forEach(v => {
        let d = duration(v)
        if (d > md) {
            md = d;
        }
    })
    console.log('maxDuration', md);
    return md;
}


function listBigVideoMjrs() {
    let cmd = 'ls videoroom*-video-1.mjr';
    let stdout = execSync(cmd);
    let files = stdout.toString().split('\n').filter(f => f.startsWith('videoroom'))
    console.log('listBigVideoMjrs: \n', files);
    return files;
}

function listAudioMjrs() {
    let cmd = 'ls videoroom*-audio-0.mjr';
    let stdout = execSync(cmd);
    let files = stdout.toString().split('\n').filter(f => f.startsWith('videoroom'))
    console.log('listAudioMjrs: \n', files);
    return files;
}

// FYI https://www.jimby.name/techbits/recent/xstack/
function merge(outputVideo, w, h, ...videos) {
    let input = () => {
        let tmp = '';
        videos.forEach(v => {
            tmp += '-i ' + v + '\\';
        })
        return tmp;
    }

    let filterConfig = () => {
        let config = ''
        for (let i = 0; i < videos.length; i++) {
            config  += `[${i}:v] setpts=PTS-STARTPTS, scale=qvga [a${i}];\\`
        }
        return config;
    }
    //[a0][a1][a2][a3][a4][a5][a6][a7][a8]xstack=inputs=9:layout=0_0|w0_0|w0+w1_0|0_h0|w0_h0|w0+w1_h0|0_h0+h1|w0_h0+h1|w0+w1_h0+h1[out] \

    let cmd = `ffmpeg \
    ffmpeg \
    ${input()} \
    -filter_complex " \
      [0:v] setpts=PTS-STARTPTS, scale=qvga [a0]; \
      [1:v] setpts=PTS-STARTPTS, scale=qvga [a1]; \
      [2:v] setpts=PTS-STARTPTS, scale=qvga [a2]; \
      [a0][a1][a2]xstack=inputs=3:layout=0_0|0_h0|w0_0[out];amix=inputs=3 \
      " \
    -map "[out]" \
    -c:v libx264  output_col_2x2.mp4
    `
    console.log('grid layout')
    execSync(cmd)

}

function test() {
    let bigVideoMjrs = listBigVideoMjrs();
    let startTimestamp = bigVideoMjrs
        .map(f => f.split('-')[4])
        .reduce((previousValue, currentValue, currentIndex, array) => {
            return currentValue < previousValue ? currentValue : previousValue;
        });
    console.log('conference start timestamp', startTimestamp)

    let tmpDir = 'tmp';
    execSync(`rm -rf ${tmpDir}`)
    execSync(`mkdir ${tmpDir}`)
    bigVideoMjrs.forEach(f => {
        mjrToMp4(f, `${tmpDir}/${f}.mp4`)
    })

    let audioMjrs = listAudioMjrs();
    audioMjrs.forEach(f => {
        mjrToOpus(f, `${tmpDir}/${f}.opus`)
    })

    // video file 和 audio file 是一一对应的
    let tmpMergedVideoDir = 'tmpMergedVideo';
    execSync(`rm -rf ${tmpMergedVideoDir}`)
    execSync(`mkdir ${tmpMergedVideoDir}`)

    let userVideoMap = new Map();

    bigVideoMjrs.forEach(f => {
        let varr = f.split('-');
        let prefix = varr[0] + '-' + varr[1] + '-' + varr[2] + '-' + varr[3];
        let audioFiles = audioMjrs.filter(f => f.startsWith(prefix));
        let audioFile;
        if (audioFiles.length === 1) {
            audioFile = audioFiles[0];
        } else {
            // 找和视频时间最接近的相同用户的音频文件
            // 时间在一秒以内
            for (const af of audioFiles) {
                let aarr = af.split('-');
                if (Math.abs(varr[4] - aarr[4]) < 100 * 1000) {
                    audioFile = af;
                    break
                }
            }
        }
        mergeAudioAndVideo(`${tmpDir}/${f}.mp4`, `${tmpDir}/${audioFile}.opus`, `${tmpMergedVideoDir}/${f}.mp4`)

        let userId = varr[3];
        let userVideos = userVideoMap.get(userId);
        if (!userVideos) {
            userVideos = [`${f}.mp4`];
        } else {
            userVideos.push(`${f}.mp4`)
        }
        userVideoMap.set(userId, userVideos);
    })

    //execSync(`rm -rf ${tmpDir}`)

    let tmpPaddedVideoDir = 'tmpPaddedVideo';
    execSync(`rm -rf ${tmpPaddedVideoDir}`)
    execSync(`mkdir ${tmpPaddedVideoDir}`)

    // pad
    userVideoMap.forEach((videos, userId) => {
        console.log('user videos', videos)
        if (videos.length > 1) {
            let tmpUserPaddedVideoDir = 'tmpUserPaddedVideo';
            execSync(`rm -rf ${tmpUserPaddedVideoDir}`)
            execSync(`mkdir ${tmpUserPaddedVideoDir}`)

            let sortedVideos = videos.sort();
            let ts = sortedVideos[0].split('-')[4];
            let paddedUserVideos = [];
            padStart(`${tmpMergedVideoDir}/${sortedVideos[0]}`, (ts - startTimestamp) / 1000 / 1000, `${tmpUserPaddedVideoDir}/${sortedVideos[0]}`)
            paddedUserVideos.push(`${tmpUserPaddedVideoDir}/${sortedVideos[0]}`)
            for (let i = 1; i < sortedVideos.length; i++) {
                let preTS = sortedVideos[i - 1].split('-')[4];
                let curTS = sortedVideos[i].split('-')[4];
                padStart(`${tmpMergedVideoDir}/${sortedVideos[i]}`, (curTS - preTS) / 1000 / 1000, `${tmpUserPaddedVideoDir}/${sortedVideos[i]}`)
                paddedUserVideos.push(`${tmpUserPaddedVideoDir}/${sortedVideos[i]}`)
            }
            // 同一用户的多段视频拼接
            concat(`${tmpPaddedVideoDir}/${sortedVideos[0]}`, ...paddedUserVideos);

        } else {
            let ts = videos[0].split('-')[4];
            padStart(`${tmpMergedVideoDir}/${videos[0]}`, (ts - startTimestamp) / 1000 / 1000, `${tmpPaddedVideoDir}/${videos[0]}`)
        }
    })

    // grid layou


    execSync(cmd)

    // maxDuration(...files);
}


//
// exec(cmd, (error, stdout, stderr) => {
//     if (error) {
//         console.log(`exec error: ${error}`)
//         return
//     }
//     console.log(`stdout: ${stdout}`);
//     console.error(`stderr: ${stderr}`);
// })

// padEnd('xqq.mp4', 30, 'test.mp4');
// padStart('test.mp4', 30, 'xxx.mp4')
// concat('yyy.mp4', 'xxx.mp4', 'test.mp4')

function xx() {
    let cmd = `
    ${20 / 2}
    `
}

test();
