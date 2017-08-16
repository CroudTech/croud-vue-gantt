<template>
  <div id="app">
    <gantt :calculate="false" :events="ganttData" :end-period="endPeriod" :start-period="startPeriod" @load-more="loadMore" @selected="selected" :grouping="true" :show-repeats="false"></gantt>
  </div>
</template>

<script>
import Vue from 'vue'
import moment from 'moment'
import Gantt from './components/Gantt'

export default {
    name: 'app',
    components: {
        Gantt,
    },

    data() {
        return {
            moment,
            initialLoad: false,
            selectedBlock: null,
            startPeriod: moment().startOf('month').startOf('week'),
            endPeriod: moment().add(1, 'months'),
            params: {
                from: moment().subtract(1, 'years').format('YYYY-MM-DD'),
                to: moment().subtract(1, 'years').add(1, 'months').format('YYYY-MM-DD'),
                page: 0,
            },
            ganttData: [
                {
                    title: 'Line One',
                    offset: moment().diff(moment().startOf('month').startOf('week'), 'days'),
                    duration: 4,
                    status: 'complete',
                    x: 0,
                    width: 0,
                    readOnly: true,
                },
                {
                    title: 'A New Event',
                    offset: moment().diff(moment().startOf('month').startOf('week'), 'days') + 3,
                    duration: 2,
                    frequency: {
                        key: 'weekly',
                    },
                    dependencies: [],
                    status: 'in_progress',
                    x: 0,
                    width: 0,
                },
                {
                    title: 'Dependent Event',
                    offset: moment().diff(moment().startOf('month').startOf('week'), 'days') + 5,
                    duration: 2,
                    frequency: {
                        key: 'weekly',
                    },
                    dependencies: [0, 1],
                    status: 'active',
                    x: 0,
                    width: 0,
                },
                {
                    title: 'Another Event',
                    offset: moment().diff(moment().startOf('month').startOf('week'), 'days') + 7,
                    duration: 4,
                    frequency: {
                        key: 'once',
                    },
                    dependencies: [2],
                    status: 'active',
                    x: 0,
                    width: 0,
                },
            ],
        }
    },

    computed: {
        urlParams() {
            return {
                from: moment(this.params.from).format('YYYY-MM-DD HH:mm:ss'),
                // to: moment(this.params.to).format('YYYY-MM-DD HH:mm:ss'),
                channel_ids: [293],
                includes: ['channel'],
                days: 30,
                page: this.params.page,
            }
        },
    },

    methods: {
        loadMore() {
            this.endPeriod = moment(this.endPeriod).add(30, 'days')
            // this.params.to = moment(this.params.to).add(1, 'months').format('YYYY-MM-DD')
            this.params.page += 1
        },

        selected(block) {
            console.log(block)
            this.selectedBlock = block
        },
    },

    mounted() {
        this.$http.get('api/event/gantt', {
            params: this.urlParams,
        }).then((response) => {
            this.ganttData = response.data.data.filter(event => !!event.channel_id).map((event) => {
                event.frequency = { key: 'once' }
                event.page = response.data.page
                return event
            })
            this.initialLoad = true
            // console.log(this.ganttData)
        })
    },

    created() {
        Vue.http.options.root = '//gateway.croudcontrol.dev/'
        Vue.http.headers.common.Authorization = `Bearer ${localStorage.getItem('jwt')}`
    },

    watch: {
        urlParams: {
            deep: true,
            handler() {
                if (!this.initialLoad) return
                this.$http.get('api/event/gantt', {
                    params: this.urlParams,
                }).then((response) => {
                    this.ganttData = this.ganttData.concat(response.data.data.filter(event => !!event.channel_id).map((event) => {
                        event.frequency = { key: 'once' }
                        event.page = response.data.page
                        return event
                    }))
                })
            },
        },
    },
}
</script>

<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
