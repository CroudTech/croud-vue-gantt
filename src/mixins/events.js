// import Vue from 'vue'
import chrono from 'chrono-node'
import moment from 'moment'
// import _ from 'lodash'

export default {
    // vuex: {
    //     getters: {
    //         vuex_events: state => state.events.list,
    //         category_filters: state => state.base.category_filters,
    //         vuex_start: state => state.events.start_date,
    //         vuex_end: state => state.events.end_date,
    //         preset_list: (state) => {
    //             const presets = {}
    //             for (const i in state.base.adp_presets) {
    //                 presets[state.base.adp_presets[i].id] = state.base.adp_presets[i]
    //             }
    //             return presets
    //         },
    //         preset_labels: (state) => {
    //             const presets = {}
    //             for (const i in state.base.adp_presets) {
    //                 presets[state.base.adp_presets[i].id] = state.base.adp_presets[i].label
    //             }
    //             return presets
    //         },
    //     },
    // },
    props: {
        refresh_nodes: {
            default: false,
        },
        calculate: {
            default: false,
        },
        props: {
            offsets: {
                type: Boolean,
                default: false,
            },
            durations: {
                type: Boolean,
                default: false,
            },
        },
    },
    data() {
        return {
            // nodes: [],
        }
    },
    watch: {
        refresh_nodes(value) {
            if (value) {
                this.buildNodes()
            }
        },
    },
    filters: {
        date: {
            read(val) {
                return val.format('Y-MM-DD')
            },
            write(val) {
                return moment(val)
            },
        },
        number: {
            read(val) {
                return val
            },
            write(val) {
                return Number(val)
            },
        },

        frequency: {
            read(val) {
                return val.name
            },
            write(val) {
                return this.frequencies.filter(f => f.id === val)[0]
            },
        },

        chrono: {
            read(val) {
                if (typeof val === 'object') {
                    return val.format('ddd D MMMM')
                }

                return val
            },
            write(val, old) {
                const chronoDate = chrono.parse(val, this.start.toDate())

                if (chronoDate && chronoDate.length > 0 && chronoDate[0].start) {
                    return moment(chronoDate[0].start.date()).startOf('day')
                }

                return old
            },
        },
    },
    methods: {

        presetName(preset) {
            const title = []

            if (preset.channel) {
                title.push(preset.channel)
                title.push('-')
            }

            title.push(preset.title)

            return title.join(' ')
        },

        closeEvent(event) {
            event.editing = false
        },
        dateFormat(date) {
            return date.format('ddd D MMMM')
        },
    },
    computed: {
        startDescription() {
            return this.dateFormat(this.vuex_start)
        },
        dateDescription() {
            if (!this.event) return ''

            const description = []

            if (this.event.start) {
                if (this.event.frequency && this.event.frequency.id && this.event.frequency.key === 'once') {
                    description.push(`Runs on ${this.dateFormat(this.event.start)}`)
                } else {
                    description.push(`First runs on ${this.dateFormat(this.event.start)}`)
                }
            }

            if (this.event.duration) {
                if (this.event.duration === 1) {
                    description.push(' and lasts 1 day')
                } else {
                    description.push(` and lasts ${this.event.duration + 1} days`)
                }
            }

            if (this.event.frequency) {
                if (this.event.frequency.id && this.event.frequency.key !== 'once') {
                    description.push(`, repeating ${this.event.frequency.title.toLowerCase()}`)

                    if (this.event.recurrences && this.event.recurrences > 1) { description.push(` for a maximum of ${this.event.recurrences} times`) }

                    if (this.event.recurrence_limit && this.event.recurrence_limit) { description.push(` until ${this.dateFormat(this.event.recurrence_limit)}`) }
                }
            }

            return description.join('')
        },

        filteredEvents() {
            if (!this.category_filters) {
                return this.vuex_events
            }
            const events = this.vuex_events.filter(ev => this.category_filters.indexOf(parseInt(ev.preset_id, 10)) < 0).map((event, index) => {
                event.event_index = index
                return event
            })
            return events
        },

        nodes() {
            if (!this.calculate) return []

            const limits = this.limits
            // const filterBy = Vue.filter('filterBy')
            // let children

            this.groupings = []

            const position = (event) => {
                event.x = (moment(event.start).diff(limits.start, this.scale)) * this.scaleWidth
                event.width = ((moment(event.end).diff(event.start, this.scale)) + 1) * this.scaleWidth
                event.height = this.blockHeight - 15
                event.y = (event.event_index * this.blockHeight) + 7.5
                return event
            }

            // return filterBy(filterBy(this.repeats, this.category, 'category'), this.search, 'title')
            const result = this.repeats.map((event, index) => {
                event.event_index = index
                this.groupings.push(event.title)
                if (event.children && event.children.length) {
                    event.children.map((ch) => {
                        ch.event_index = index
                        position(ch)
                        return ch
                    })
                }
                position(event)
                return event
            })


            return result
        },

        limits() {
            const limits = {
                start: false,
                end: this.end_period,
                range: 0,
                units: this.scale,
                height: this.groupings.length * (this.blockHeight + 40),
            }

            // if (!this.calculate) return limits

            this.filteredEvents.map((event) => {
                if (limits.start === false || moment(event.start).isBefore(limits.start)) {
                    limits.start = moment(event.start).startOf('week')
                }
                if (limits.end === false || moment(event.end).isAfter(limits.end)) {
                    limits.end = moment(event.end).endOf('week')
                }
                return event
            })

            limits.range = Math.ceil(limits.end.diff(limits.start, this.scale))

            return limits
        },

        repeats() {
            // const preset_labels = this.preset_labels
            const inst = this
            // const withRepeats = []
            const masterEvents = []
            // const children = []


            this.filteredEvents.map((curr, index) => {
                // const newEvent = _.cloneDeep(curr)
                // newEvent.repeat = true
                curr.selected_event_index = index
                curr.children = []

                // curr.label = preset_labels[curr.preset_id]
                switch (curr.frequency.key) {
                case 'daily':
                        // curr.label = '#0B8043'
                    curr.children = inst.addRepeats(curr, 1, 'days')
                    break

                case 'every_work_day':
                        // curr.label = '#880022'
                    curr.children = inst.addRepeats(curr, 1, 'every_work_day')
                    break

                case 'weekly':
                        // curr.label = '#EE8100'
                    curr.children = inst.addRepeats(curr, 1, 'weeks')
                    break

                case 'four_weekly':
                        // curr.label = '#DB4437'
                    curr.children = inst.addRepeats(curr, 4, 'weeks')
                    break

                case 'fortnightly':
                        // curr.label = '#DB4437'
                    curr.children = inst.addRepeats(curr, 2, 'weeks')
                    break

                case 'monthly':
                        // curr.label = '#6A1B9A'
                    curr.children = inst.addRepeats(curr, 1, 'months')
                    break

                case 'Quarterly':
                        // curr.label = '#C5BBFE'
                    curr.children = inst.addRepeats(curr, 1, 'quarters')
                    break

                default:
                }

                masterEvents.push(curr)
                return curr
            })

            return masterEvents
        },


    },
}
