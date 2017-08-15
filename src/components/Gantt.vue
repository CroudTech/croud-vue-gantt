<template>
    <div>
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

            <div id="timeline-header"></div>
            <div id="timeline-container" ref="container" @mousemove="move" @mouseup="mouseUp">
                <div id="timeline" class="timeline" ref="timeline">
                    <svg ref="svg" id="timeline-events" :width="svgWidth" :height='limits.height + 21'>
                        <g>
                            <g class="rows" transform="translate(0, 20)">
                                <rect v-for="(block, $index) in groupings" x="0" :y="blockHeight * $index" width="100%" :height="blockHeight" stroke="#f5f5f5" stroke-width="2" ></rect>
                            </g>

                            <g class="graph" transform="translate(300, 0)">
                                <g class="titles">
                                    <g v-for="(line, $index) in gridLines" v-if="$index % smartGrids === 1">
                                        <text text-anchor="middle" :x="($index - 1) * hourWidth" y="10">{{ line }}</text>
                                    </g>
                                    <foreignObject :x='svgWidth - 500' width="1" height="100%" v-if="inifinteScroll">
                                        <v-waypoint @waypoint="collide" :horizontal="true"></v-waypoint>
                                    </foreignObject>
                                </g>

                                <foreignObject width="100%" height="100%" transform="translate(0, 20)">
                                    <div class="grid-pattern" :style="{height: limits.height + 'px'}"></div>
                                </foreignObject>

                                <g class="paths" transform="translate(0, 20)">
                                    <path v-for="link in linkPaths" :d="link.path" :class="{critical: link.critical}" />
                                </g>

                                <g class="blocks" transform="translate(0, 20)">
                                    <g class="block" v-for="(block, $index) in nodes" >
                                        <title>{{ block.title }}</title>

                                        <rect @contextmenu.prevent="openContext($event, $index)" @click="select(block, $index)" @mousedown="adjustStart(block, $event)" rx="2" ry="2" :x="block.x" :y='block.y' :width='block.width' :height='block.height' :class="{editable: !block.readOnly}" :style="{fill: block.label}">
                                            <title v-if="block.readOnly" >🔒{{ block.readOnly }}</title>
                                            <title v-else>{{ block.title }}</title>
                                        </rect>
                                        <text v-if="block.readOnly" :x="block.x + (block.width / 2)" :y="block.y + 2 * (block.height / 3)" style="font-family: Icons" class="icon" text-anchor="middle">&#xf023;</text>

                                        <foreignObject>
                                            <context-menu :ref="'ctxMenu' + $index">
                                                <li @click="$emit('selected', block)" class="item">
                                                    <i class="edit icon"></i>Edit
                                                </li>
                                            </context-menu>
                                        </foreignObject>

                                        <rect v-if="!block.readOnly" class="drag-handle" @mousedown.prevent="adjustEnd(block, $event)" rx="5" ry="5" :x="block.x + block.width - 10" :y='block.y' width='10' :height='block.height' fill="#ccc"/>

                                        <!--<rect v-for="child in block.children" rx="2" ry="2" :x="child.x" :y='child.y' :width='child.width' :height='child.height' class="repeat" :style="{fill: child.label}">
                                            <title>{{ child.title }}</title>
                                        </rect>-->
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
    import _ from 'lodash'
    import contextMenu from 'vue-context-menu'

    export default {
        props: {
            endPeriod: {
                default() {
                    return moment().add(1, 'months')
                },
            },
            startPeriod: {
                default() {
                    return moment().startOf('week')
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
            inifinteScroll: {
                default: false,
            },
            grow: {
                default: false,
            },
        },

        components: {
            contextMenu,
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
                cloned: null,

                statusColors: {
                    complete: '#8bccba',
                    active: '#6bc2e2',
                    in_progress: '#fbbd08',
                },
            }
        },

        computed: {
            svgWidth() {
                // if (!this.calculate) return 0

                if (this.autoScale) {
                    return '100%'
                }
                if (!this.hourWidth || !this.limits.range) return 0

                return (this.hourWidth * this.limits.range) + 200
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
                this.links = []

                return this.repeats.map((event, i) => {
                    let index = this.groupings.indexOf(event.title.toLowerCase())
                    if (index === -1) {
                        index = this.groupings.length
                        this.groupings.push(event.title.toLowerCase())
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
                    start: this.startPeriod,
                    actualStart: this.startPeriod,
                    end: this.endPeriod,
                    range: 0,
                    units: this.scale,
                    height: this.groupings.length * (this.blockHeight),
                }

                this.events.map((event) => {
                    if (this.grow && (limits.end === false || moment(event.end).isAfter(limits.end))) {
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
                    curr.label = this.statusColors[curr.status]
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

        methods: {
            openContext(e, index) {
                this.$refs[`ctxMenu${index}`][0].open({
                    pageX: e.offsetX,
                    pageY: e.offsetY,
                })
            },

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
                event.page = event.page || 1
                event.x = ((event.offset + this.globalOffset) + ((event.page - 1) * 30)) * this.scaleWidth
                event.width = event.duration * this.scaleWidth
                event.height = this.blockHeight - 15
                event.y = (event.event_index * this.blockHeight) + 7.5
                return event
            },

            select(block) {
                this.localSelected = block
            },

            adjustStart(block, evt) {
                if (evt.which === 3 || block.readOnly) return
                this.startMouse = evt
                this.dragging = 'start'
                this.localSelected = block
                this.cloned = _.cloneDeep(this.localSelected)
            },

            adjustEnd(block, evt) {
                if (evt.which === 3 || block.readOnly) return
                this.startMouse = evt
                this.dragging = 'end'
                this.localSelected = block
                this.cloned = _.cloneDeep(this.localSelected)
            },

            // move: _.debounce(function (evt) {
            move(evt) {
                if (!this.dragging) return

                const diff = Math.round((evt.clientX - this.startMouse.clientX) / this.scaleWidth)

                if (Math.abs(diff)) {
                    const position = this.calculate ? this.calculatedPosition : this.position

                    if (this.dragging === 'start') {
                        this.cloned.offset += diff
                        this.cloned.starts_at = moment(this.cloned.starts_at).add(diff, 'days').format('YYYY-MM-DD')
                    } else {
                        this.cloned.duration += diff
                    }

                    this.cloned.ends_at = moment(this.cloned.ends_at).add(diff, 'days').format('YYYY-MM-DD')

                    position(this.cloned)
                    this.localSelected.x = this.cloned.x
                    this.localSelected.width = this.cloned.width

                    this.startMouse = {
                        clientX: this.startMouse.clientX + (diff * this.scaleWidth),
                    }
                }
            // }, 10),
            },

            mouseUp(evt) {
                if (!this.dragging || evt.which === 3) return

                this.dragging = false
                this.localSelected.offset = this.cloned.offset
                this.localSelected.starts_at = this.cloned.starts_at
                this.localSelected.duration = this.cloned.duration
                this.localSelected.ends_at = this.cloned.ends_at
                this.$emit('update-event', this.localSelected)
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
    }
</script>

<style lang="scss" scoped>
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
    .blocks rect.drag-handle {
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
    }

    path {
        fill: none;
        stroke: #000;
        stroke-width: 1.8px;
        transition: all 400ms;
    }

    text {
        cursor: default;
        -webkit-user-select: none;
        -webkit-font-smoothing: antialiased;
        font-family: Arial;
        font-size: 13px;
        text-transform: capitalize;
    }

    #timeline-sidebar {
        position:absolute;
        padding-top:30px;
        overflow: hidden;
        border-right: 5px solid rgba(200, 200, 200, 1);
        transform: translateY(20px);
    }

    #timeline {
        width: 100%;
        display: block;
        overflow-x: scroll;
    }
    #timeline-header {
        overflow: hidden;
        background: white;
        position: relative;
        z-index: 1000;
        top: 20px;
        width: 300px;
        height: 30px;
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
        overflow: visible;
        overflow-x: scroll;
    }
    #timeline-index {
        height:30px;
    }
    #adpcalendar {
        overflow: hidden;
        transform: translateY(-20px);
        margin-bottom: 20px;
    }

    .grid-pattern {
        width: 100%;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='203.7' height='100' viewBox='0 0 203.7 100'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.4'%3E%3Cpath opacity='.5' d='M0 0 H 5 V 100 H 0 Z m29.1 0 h 1 V 100 h -1 Z m29.1 0 h 1 V 100 h -1 Z m29.1 0 h 1 V 100 h -1 Z m29.1 0 h 1 V 100 h -1 Z m29.1 0 h 1 V 100 h -1 Z m29.1 0 h 1 V 100 h -1 Z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
    }

    text.icon {
        font-family: Icons;
        color: white;
        text-shadow: 0 0 1px rgba(0,0,0,0.5);
    }
</style>

<style>
    .ctx-menu-container .ctx-menu.ctx-menu-left {
        background-color: #353e40;
        padding: 1em;
        color: white;
        cursor: pointer;
        min-width: 120px;
    }
</style>
