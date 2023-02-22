<template>
    <div class="hello">
        <h1>会议录制播放器</h1>
        <div class="video-container">
            <div v-for="(v, i) in videos" :key="i">
                <video :ref="v" playsinline controls>
                    <source :src="basePath + v" type="video/mp4">
                </video>
            </div>

        </div>
        <div class="audio-container">

        </div>
    </div>
</template>

<script>
export default {
    name: 'HelloWorld',
    props: {
        msg: String
    },
    data() {
        return {
            basePath: 'http://192.168.2.12:8080/merged/',
            mediaFiles: [
                'videoroom-2179615798-user-1579737834015809537-1672210684398979-audio-0.mjr.opus',
                'videoroom-2179615798-user-1579737834015809537-1672210684399095-video-1-a.mjr.mp4',
                'videoroom-2179615798-user-1583824969728114689-1672210806420791-audio-0.mjr.opus',
                'videoroom-2179615798-user-1583824969728114689-1672210806420952-video-1-a.mjr.mp4',
                'videoroom-2179615798-user-1583826497415266305-1672210482870658-audio-0.mjr.opus',
                'videoroom-2179615798-user-1583826497415266305-1672210482870825-video-1-a.mjr.mp4',
                'videoroom-2179615798-user-1583826497415266305-1672210524220737-audio-0.mjr.opus',
                'videoroom-2179615798-user-1583826497415266305-1672210524220897-video-1-a.mjr.mp4'
            ],

            //ffmpeg -i 1.mp4 -i 1.opus -c:v copy -c:a aac call.mp4

            audios: [],
            videos: [],
            conferenceInfo: {
                participantList: [],
                videoFiles: [
                    {
                        name: 'name',
                        url: 'url',
                        offset: 0,
                    }
                ],
            }
        }
    },
    mounted() {
        this.mediaFiles.forEach(mf => {
            if (mf.endsWith('.mp4')) {
                this.videos.push(mf);
            } else {
                this.audios.push(mf);
            }
        })
    },
    methods: {
        startPlay() {

        }
    }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h1 {
    margin: 40px 0 0;
}

</style>
