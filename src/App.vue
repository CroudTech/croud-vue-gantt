<template>
  <div id="app">
    <img src="./assets/logo.png">
    <h1>Selected</h1>
    <div>
        <strong v-if="selectedBlock">{{ selectedBlock.title }}</strong>
    </div>
    <div v-if="selectedBlock">
        <strong>Start:</strong> {{ moment(selectedBlock.start).format('DD MMMM YY') }}
    </div>
    <div v-if="selectedBlock">
        <strong>Duration:</strong> {{ selectedBlock.duration }} days
    </div>
    <div v-if="selectedBlock">
        <strong>Page:</strong> {{ selectedBlock.page }}
    </div>
    <div v-if="selectedBlock">
        <strong>Duration:</strong>
        <input v-model="selectedBlock.duration" type="number">
    </div>

    <input type="date" v-model="params.from"/>
    <input type="date" v-model="params.to"/>
    <!-- <pre>{{ selectedBlock }}</pre> -->
    <hello :calculate="false" :events="ganttData" :end-period="endPeriod" @load-more="loadMore" @selected="selected" :grouping="true"></hello>
  </div>
</template>

<script>
import Vue from 'vue'
import moment from 'moment'
import Hello from './components/Gantt'

export default {
    name: 'app',
    components: {
        Hello,
    },

    data() {
        return {
            moment,
            initialLoad: false,
            selectedBlock: null,
            endPeriod: moment().subtract(1, 'years').add(1, 'months'),
            params: {
                from: moment().subtract(1, 'years').format('YYYY-MM-DD'),
                to: moment().subtract(1, 'years').add(1, 'months').format('YYYY-MM-DD'),
                page: 0,
            },
            ganttData: [
                {
                    title: 'Line One',
                    description: 'A test',
                    category: null,
                    preset_id: null,
                    offset: 1,
                    duration: 1,
                    label: '#41B883',
                    error: false,
                    editing: false,
                    new_event: true,
                    max_length: 1,
                    max_times_to_run: 0,
                    end_date_limit: '',
                    frequency: {
                        key: 'every_work_day',
                    },
                    dependencies: [],
                },
                {
                    title: 'A New Event',
                    description: 'Another test',
                    category: null,
                    preset_id: null,
                    offset: 3,
                    duration: 2,
                    label: '#35495E',
                    error: false,
                    editing: false,
                    new_event: true,
                    max_length: 1,
                    max_times_to_run: 0,
                    end_date_limit: '',
                    frequency: {
                        key: 'weekly',
                    },
                    dependencies: [],
                },
                {
                    title: 'Dependent Event',
                    description: 'Another test',
                    category: null,
                    preset_id: null,
                    offset: 5,
                    duration: 2,
                    label: '#41B883',
                    error: false,
                    editing: false,
                    new_event: true,
                    max_length: 1,
                    max_times_to_run: 0,
                    end_date_limit: '',
                    frequency: {
                        key: 'weekly',
                    },
                    dependencies: [0, 1],
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
