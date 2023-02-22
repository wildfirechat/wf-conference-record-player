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
    console.log('mergeAudioAndVideo')
    let cmd = `ffmpeg -i ${inputVideo} -i ${inputAudio} -c:v copy -c:a aac ${outputVideo}`
    execSync(cmd)
}


function padEnd(inputVideo, duration, outVideo) {
    console.log('padEnd', outVideo, duration);
    let cmd = `ffmpeg -i ${inputVideo} -filter_complex "[0:v]tpad=stop_duration=${duration}[v];[0:a]apad=pad_dur=${duration}[a]" -map "[v]" -map "[a]" ${outVideo}`
    return execSync(cmd);
}

function padStart(inputVideo, duration, outVideo) {
    console.log('padStart', outVideo, duration);
    let tmpFile = inputVideo + '.mp4';
    let padCmd = `ffmpeg -i ${inputVideo} -filter_complex "tpad=start_duration=${duration}" ${tmpFile} `;
    execSync(padCmd);
    let delayCmd = `ffmpeg -i ${tmpFile} -itsoffset ${duration} -i ${tmpFile} -map 0:v -map 1:a -c copy ${outVideo}`;
    execSync(delayCmd);
    execSync(`rm -f ${tmpFile}`);

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
    let concatCmd = `ffmpeg -f concat -i list.txt -c:v copy -c:a copy ${outputVideo}`
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


function listFile() {
    let cmd = 'ls videoroom*';
    let stdout = execSync(cmd);
    let files = stdout.toString().split('\n').filter(f => f.startsWith('videoroom'))
    console.log('listFile: ', files);
    return files;
}

function test() {
    let files = listFile();
    maxDuration(...files);
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

test();
