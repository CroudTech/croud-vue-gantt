<template>
    <div>
        <!-- <pre>{{ filteredEvents }}</pre> -->
        <!-- <pre>{{ nodes }}</pre> -->
        <!-- {{ nodes }} -->
        <!-- <pre>{{ repeats }}</pre> -->
        <div id="adpcalendar">
            <div id="timeline-sidebar">
                <svg id="event-types" ref="svg" :width="300" :height='limits.height'>
                    <g class="rows" transform="translate(0, 0)">
                        <rect v-for="(block, $index) in groupings" x="0" :y="blockHeight * $index" width="100%" :height="blockHeight" stroke="#f5f5f5" stroke-width="2" ></rect>
                    </g>
                    <g v-for="(block, $index) in groupings" transform="translate(0, 0)" >
                        <title>{{ block }}</title>
                        <text @click="select(block)" text-anchor="right" :x="5" :y="(blockHeight * $index) + 5 +(blockHeight / 2)">{{ block | truncate(35) }}</text>
                    </g>
                </svg>
            </div>

            <div id="timeline-header">
                <div id="timeline-index">
                    <svg id="timeline-events" :width="svgWidth" height="30">
                        <v-waypoint @waypoint="collide" :horizontal="true" position="right"></v-waypoint>
                        <g transform="translate(40, 0)">
                            <g>
                                <g v-for="(line, $index) in gridLines">
                                    <line :x1='$index * scaleWidth' y1='95%' :x2='$index * scaleWidth' y2='100%' style='stroke: rgba(234, 243, 234, 0.5); stroke-width: 1;'></line>
                                    <line v-if="$index % smartGrids === 0" :x1='$index * scaleWidth' y1='65%' :x2='$index * scaleWidth' y2='99%' style='stroke: rgba(230, 230, 230, 0.7); stroke-width: 5;'></line>
                                    <text v-if="$index % smartGrids === 0" text-anchor="middle" :x="$index * hourWidth" y="50%">{{ line }}</text>
                                    <foreignObject v-if="$index + 1 === gridLines.length" :x='$index * scaleWidth' width="1" height="1">
                                        <v-waypoint @waypoint="collide" :horizontal="true"></v-waypoint>
                                    </foreignObject>
                                </g>
                            </g>
                        </g>
                    </svg>
               </div>
            </div>
            <div id="timeline-container" ref="container" @mousemove="move" @mouseup="mouseUp">
                <div id="timeline" class="timeline" ref="timeline">
                    <svg ref="svg" id="timeline-events" :width="svgWidth" :height='limits.height'>
                        <g>
                            <g class="rows">
                                <rect v-for="(block, $index) in groupings" x="0" :y="blockHeight * $index" width="100%" :height="blockHeight" stroke="#f5f5f5" stroke-width="2" ></rect>
                            </g>

                            <g class="graph" transform="translate(40, 0)">
                                <g>
                                    <g v-for="(line, $index) in gridLines" >
                                        <line :x1='$index * scaleWidth' y1='0%' :x2='$index * scaleWidth' y2='100%' style='stroke: rgba(200, 200, 200, 0.3); stroke-width: 1;'></line>
                                        <line v-if="$index % smartGrids === 0" :x1='$index * scaleWidth' y1='0%' :x2='$index * scaleWidth' y2='100%' style='stroke: rgba(230, 230, 230, 0.7); stroke-width: 5;'></line>
                                    </g>
                                </g>

                                <g class="paths">
                                    <path v-for="link in linkPaths" :d="link.path" :class="{critical: link.critical}" />
                                </g>

                                <g class="blocks" >
                                    <g class="block" v-for="(block, $index) in nodes" >
                                        <title>{{ block.title }}</title>

                                        <!-- <rect @click="select(block, $index)" @mousedown="adjustStart(block, $event)" rx="2" ry="2" :x="block.x" :y='block.y' :width='block.width' :height='block.height' class="editable" :style="{fill: block.label}"> -->
                                        <rect @click="select(block, $index)"  rx="2" ry="2" :x="block.x" :y='block.y' :width='block.width' :height='block.height' class="editable" :style="{fill: block.label}">
                                            <title>{{ block.title }}</title>
                                        </rect>
                                        <!-- <rect class="drag-handle" @mousedown.prevent="adjustEnd(block, $event)" rx="5" ry="5" :x="block.x + block.width - 10" :y='block.y' width='10' :height='block.height' fill="#ccc"/> -->
                                        <rect v-for="child in block.children" rx="2" ry="2" :x="child.x" :y='child.y' :width='child.width' :height='child.height' class="repeat" :style="{fill: child.label}">
                                            <title>{{ child.title }}</title>
                                        </rect>
                                    </g>
                                </g>
                            </g>
                        </g>
                    </svg>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
    import moment from 'moment'

    export default {
        props: {
            endPeriod: {
                default() {
                    return moment().add(1, 'months')
                },
            },
            calculate: {
                default: false,
            },
            selected: {
                twoWay: true,
            },
            autoScale: {
                default: false,
            },
            criticalPath: {
                default: true,
            },
            active: false,
            events: {
                default() {
                    return []
                },
            },
            grouping: {
                default: true,
            },
        },

        data() {
            return {
                selected_index: null,
                showModal: false,
                search: '',
                xPadding: 3,
                links: [],
                finalBlock: {},
                highestDuration: 0,
                hourWidth: 29.1,
                totalWidth: 873 - 120,
                blockHeight: 35,
                scale: 'days',
                scaleWidth: 29.1,
                groupings: [],
                categories: [],
                category: null,
                categoryWidth: 300,

                localSelected: null,
            }
        },

        computed: {
            svgWidth() {
                // if (!this.calculate) return 0

                if (this.autoScale) {
                    return '100%'
                }
                if (!this.hourWidth || !this.limits.range) return 0

                return this.hourWidth * (this.limits.range + 200)
            },

            linkPaths() {
                // if (!this.calculate) return []

                return this.links.map((link) => {
                    const startX = link[0].x + (link[0].width / 2)
                    const startY = (link[0].y) + link[0].height
                    const laneTop = link[1].y
                    const endX = link[1].x
                    const endY = (link[1].y) + (this.blockHeight / 3)
                    link.path = `M${startX} ${startY}
                                L ${startX} ${laneTop}
                                a 12 12 0 0 0 12 12
                                L ${endX} ${endY}
                                M ${endX - 10} ${endY - 7}
                                L ${endX} ${endY}
                                L ${endX - 10} ${endY + 7}`
                    link.critical = link[2] ? link[2] : false
                    return link
                })
            },

            smartGrids() {
                if (this.scale === 'hours') {
                    return 24
                }
                return 7
            },

            gridDateFormat() {
                if (this.scale === 'hours') {
                    return 'Do MMM HH:mm'
                }
                return 'Do MMM'
            },

            gridLines() {
                if (this.limits.range) {
                    return Array(...Array(this.limits.range + 2)).map((a, i) => moment(this.limits.start).add(i, this.scale).format(this.gridDateFormat))
                }
                return []
            },

            nodes() {
                const position = this.calculate ? this.calculatedPosition : this.position
                this.groupings = []

                return this.repeats.map((event, i) => {
                    let index = this.groupings.indexOf(event.title)
                    if (index === -1) {
                        index = this.groupings.length
                        this.groupings.push(event.title)
                    }
                    event.event_index = this.grouping ? index : i

                    if (event.children && event.children.length) {
                        event.children.map((ch) => {
                            ch.event_index = index
                            position(ch)
                            return ch
                        })
                    }

                    if (event.dependencies) {
                        event.dependencies.map((dep) => {
                            this.links.push([
                                this.events[dep],
                                event,
                            ])

                            return dep
                        })
                    }

                    position(event)
                    return event
                })
            },

            limits() {
                const limits = {
                    start: false,
                    end: this.endPeriod,
                    range: 0,
                    units: this.scale,
                    height: this.groupings.length * (this.blockHeight),
                }

                this.events.map((event) => {
                    if (limits.start === false || moment(event.start).isBefore(limits.start)) {
                        limits.actualStart = moment(event.start)
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

            globalOffset() {
                return this.limits.actualStart.diff(this.limits.start, 'days') - 1
            },

            repeats() {
                // const preset_labels = this.preset_labels
                const inst = this
                // const withRepeats = []
                const masterEvents = []
                // const children = []

                this.events.map((curr, index) => {
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

        filters: {
            truncate(val, length) {
                if (val.length < length) {
                    return val
                }
                return `${val.substring(0, length - 3)}...`
            },
        },

        mounted() {
            this.$nextTick(() => {
                // this.totalWidth = this.$refs.svg.getBoundingClientRect().width - 120

                // const height = null
                const obj = $('#timeline')
                const $window = $(window)
                const container = $('#adpcalendar')
                const sidebar = $('#timeline-sidebar')
                const events = $('#event-types')
                const heading = $('#timeline-index')
                // const offsetLeft = container.offset().left
                const parent = container.parents('.tab')
                // const marginLeft = $('#timeline-sidebar').outerWidth()

                const resize = () => {
                    // console.log(parent.offset())
                    const height = (parent.outerHeight() - (heading.outerHeight() + 35))
                    // obj.width($window.width() - (parent.offset().left + $('#timeline-sidebar').outerWidth() + 40))
                    heading.css('width', obj.width())
                    obj.css({ 'margin-left': $('#timeline-sidebar').width(), height })
                    sidebar.height(height)
                }
                const scroll = () => {
                    heading.css({ 'margin-left': `-${obj.scrollLeft()}px` })
                    events.css({ 'margin-top': `-${obj.scrollTop()}px` })
                }
                resize()
                scroll()
                obj.scrollLeft(this.dailyWidth - ((obj.width() / 2) - (this.hourWidth * 2)))
                $window.on('resize', () => {
                    setTimeout(resize, 0)
                })
                obj.on('scroll', scroll)
            })
        },

        methods: {
            collide(e) {
                this.$emit('load-more', e)
            },

            calculatedPosition(event) {
                event.x = (moment(event.start).diff(this.limits.start, this.scale)) * this.scaleWidth
                event.width = ((moment(event.end).diff(event.start, this.scale)) + 1) * this.scaleWidth
                event.height = this.blockHeight - 15
                event.y = (event.event_index * this.blockHeight) + 7.5
                return event
            },

            position(event) {
                event.x = ((event.offset + this.globalOffset) + ((event.page - 1) * 30)) * this.scaleWidth
                event.width = event.duration * this.scaleWidth
                event.height = this.blockHeight - 15
                event.y = (event.event_index * this.blockHeight) + 7.5
                return event
            },

            select(block) {
                // this.setSelectedEvent(block, event_index)
                // this.$nextTick(() => {
                    // this.active = true
                // })
                // this.dragging = true
                this.localSelected = block
                // console.log(block)
                this.$emit('selected', block)
            },

            adjustStart(block, evt) {
                this.startMouse = evt
                this.dragging = 'start'
                this.selected = block
            },

            adjustEnd(block, evt) {
                this.startMouse = evt
                this.dragging = 'end'
                this.selected = block
            },

            move(evt) {
                if (!this.dragging) {
                    return
                }
                const diff = Math.round((evt.clientX - this.startMouse.clientX) / this.scaleWidth)
                console.log(diff)
                if (Math.abs(diff) && (this.dragging === 'start'
                || (moment.duration(this.selected.end.diff(this.selected.start, 'days')) + diff >= 1
                && this.selected.end.diff(this.selected.start, 'days') + diff <= this.selected.frequency.max_length))) {
                    if (this.dragging === 'start') {
                        this.selected.start = moment(this.selected.start).add(diff, 'days')
                        this.selected.offset = this.selected.start.diff(this.limits.start, 'days')
                        // console.log('starting: ',this.selected.start, this.selected.offset, this.dragging);
                        this.updateBlock(this.selected)
                    } else {
                        this.selected.duration += diff
                        this.updateBlock(this.selected)
                    }

                    this.selected.end = moment(this.selected.end).add(diff, 'days')
                    this.startMouse = {
                        clientX: this.startMouse.clientX + (diff * this.scaleWidth),
                    }
                }
            },

            mouseUp() {
                this.dragging = false
            },

            addRepeats(event, interval, units) {
                const eventList = []
                const actualUnit = units === 'every_work_day' ? 'days' : units

                const diff = Math.round(this.limits.end.diff(event.start, actualUnit))

                for (let i = interval; i <= diff; i += interval) {
                    const newEvent = JSON.parse(JSON.stringify(event))
                    newEvent.repeat = true

                    newEvent.start = moment(newEvent.start).add(i, actualUnit)
                    newEvent.end = moment(newEvent.end)

                    if (interval > 0) { newEvent.end.add(i, actualUnit) }
                    // if (i + this.limits.end.diff(event.start, 'days') > diff) return

                    if (units === 'every_work_day') {
                        while (newEvent.start.day() === 0 || newEvent.start.day() === 6) {
                            newEvent.start.add(1, 'days')
                            newEvent.end.add(1, 'days')
                            i += 1
                        }
                    }

                    newEvent.offset = moment(this.limits.start).add(newEvent.offset, 'days').add(i, actualUnit).diff(moment(this.limits.start), 'days')
                    eventList.push(newEvent)
                }
                return eventList
            },
        },

        watch: {
            categories() {
                $(this.$refs.categories).dropdown()
            },

            endPeriod(val) {
                console.log(val)
            },
        },
    }
</script>

<style scoped>
    div.timeline {
        overflow: auto;
    }

    .rows rect {
        fill: #fff;
    }
    .rows rect:nth-child(even) {
        fill: #f5f5f5;
    }

    .blocks rect {
        fill: #c6dafc;
        transition: all 400ms;
        /*filter: url(#dropshadow);*/
    }
    .blocks rect.repeat {
        opacity: 0.4;
    }
    /*.blocks rect.drag-handle {
        fill: #ccc;
        cursor: ew-resize;
        opacity: 0;
    }
    .block:hover .editable {
        stroke: #ddd;
        stroke-width: 3px;
        cursor: pointer;
    }
    .block:hover rect.drag-handle {
        opacity: 1;
    }*/

    path {
        fill: none;
        stroke: #000;
        stroke-width: 1.8px;
    }

    text {
        cursor: default;
        -webkit-user-select: none;
        -webkit-font-smoothing: antialiased;
        font-family: Arial;
        font-size: 13px;
    }

    #timeline-sidebar {
        position:absolute;
        padding-top:30px;
        overflow: hidden;
        border-right: 5px solid rgba(200, 200, 200, 1);
    }

    #timeline {
        width: 100%;
        display: block;
        overflow: auto;
    }
    #timeline-header {
        margin-left:300px;
        overflow:hidden;
        border-bottom: 1px solid rgba(76, 76, 76, 0.4);
    }
    #event-types {
        width: 300px;
        flex: 0 0 auto;
    }
    #timeline-content {
        flex: 1 1 auto;
        overflow:auto;
    }
    #timeline-events {
        overflow: auto;
    }
    #timeline-index {
        height:30px;
    }
    #adpcalendar {
        overflow: hidden
    }

</style>
