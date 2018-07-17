<template>
    <div>
        <div id="adpcalendar">
            <div id="timeline-sidebar">
                <div v-for="(i, index) in ganttData" :key="index" :style="{height: `${i.show ? i.height + getTopMargin : getTopMargin}px`}">
                    <div v-if="categoryGroupings" class="category-header-wrapper" :style="{'height': `${blockHeight}px`}">
                        <slot name="category-header" :data="i">
                            <div class="category-header" @click="i.show = !i.show">
                                <div class="title">{{ i.title }} ({{ i.blocks.length }})</div>
                                <div v-if="i.show" class="caret collapsed">&rsaquo;</div>
                                <div v-else class="caret">&rsaquo;</div>
                            </div>
                        </slot>
                    </div>
                    <svg id="event-types" ref="svg" :width="titleWidth" :height='i.height' v-if="i.show">
                        <g class="rows">
                            <rect v-for="(block, $index) in i.groupings" x="0" :y="blockHeight * $index" width="100%" :height="blockHeight" stroke="#f5f5f5" stroke-width="2" :key="$index"></rect>
                        </g>
                        <g v-for="(block, $index) in i.groupings" :key="$index">
                            <title>{{ block }}</title>
                            <text @click="select(block)" text-anchor="right" :x="15" :y="(blockHeight * $index) + 5 +(blockHeight / 2)">{{ block | truncate(52) }}</text>
                        </g>
                    </svg>
                </div>
            </div>

            <div id="timeline-container" ref="container" @mousemove="move" @mouseup="mouseUp">
                <div id="timeline" class="timeline" ref="timeline" :style="{'min-height': `${ganttData.length * blockHeight}px`}">
                    <div id="timeline-dates" :style="{width: `${svgWidth}px`}">
                     <svg ref="svg" :width="svgWidth" :height='22'>
                            <g>
                                <g>
                                    <g class="titles">
                                        <g v-for="(line, $index) in gridLines" v-if="$index % smartGrids === 1" :key="$index">
                                            <text text-anchor="middle" :x="($index - 1) * hourWidth + titleWidth" y="10">{{ line }}</text>
                                        </g>

                                        <foreignObject v-if="inifinteScroll" :x='svgWidth - 500' width="1" height="100%">
                                            <v-waypoint @waypoint="collide" :horizontal="true"></v-waypoint>
                                        </foreignObject>
                                    </g>
                                </g>
                            </g>
                    </svg>
                </div>
                    <div v-for="(i, rootIndex) in ganttData" :key="rootIndex" :style="{height: `${i.show ? i.height + getTopMargin : getTopMargin}px`}">
                        <svg ref="svg" id="timeline-events" :width="svgWidth" :height="i.show ? i.height + getTopMargin : 0"  v-show="i.show">
                            <g>
                                <g>
                                    <rect @click="i.show = false" x="0" :y="0" width="100%" fill="transparent" :height="blockHeight" stroke="#eceaef" stroke-width="2"></rect>
                                </g>
                                <g class="rows">
                                    <rect v-for="(block, $index) in i.groupings" x="0" :y="blockHeight * $index + getTopMargin" width="100%" :height="blockHeight" stroke="#f5f5f5" stroke-width="2" :key="$index"></rect>
                                </g>

                                <g class="graph">
                                    <foreignObject width="100%" height="100%">
                                        <div class="grid-pattern" :style="[ gridPatternStyles, { height: `${i.height}px` } ]"></div>
                                    </foreignObject>

                                    <g class="paths">
                                        <path v-for="(link, index) in linkPaths[rootIndex]" :d="link.path" :class="{critical: link.critical}" :key="index"/>
                                    </g>

                                    <g class="blocks">
                                        <g class="block" v-for="(block, $index) in i.blocks" :key="$index">
                                            <title>{{ block.title }}</title>

                                            <rect @contextmenu.prevent="openContext($event, block, rootIndex)" @click="select(block, $index)" @mousedown="adjustStart(block, $event)" rx="2" ry="2" :x="block.x" :y='block.y' :width='block.width' :height='block.height' :class="{editable: !readOnly && !block.readOnly}" :style="{fill: block.label}">
                                                <title v-if="block.readOnly" >🔒{{ block.readOnly }}</title>
                                                <title v-else>{{ block.title }}</title>
                                            </rect>
                                            <text v-if="block.readOnly" :x="block.x + (block.width / 2)" :y="block.y + 2 * (block.height / 3)" style="font-family: Icons" class="icon" text-anchor="middle">&#xf023;</text>

                                            <rect v-if="!readOnly && !block.readOnly" class="drag-handle" @mousedown.prevent="adjustEnd(block, $event)" rx="5" ry="5" :x="block.x + block.width - 10" :y='block.y' width='10' :height='block.height' fill="#ccc"/>

                                            <rect v-if="showRepeats" v-for="(child, index) in block.children" rx="2" ry="2" :x="child.x" :y='child.y' :width='child.width' :height='child.height' class="repeat" :style="{fill: child.label}" :key="index">
                                                <title>{{ child.title }}</title>
                                            </rect>
                                        </g>

                                        <foreignObject>
                                            <context-menu ref="ctxMenu">
                                                <slot name="context-menu" :selected="localSelected">
                                                    <li @click="$emit('selected', localSelected)" class="item">
                                                        <i class="edit icon"></i>Edit
                                                    </li>
                                                </slot>
                                            </context-menu>
                                        </foreignObject>
                                    </g>
                                </g>
                            </g>
                        </svg>
                        <div v-show="!i.show" class="closed-bar" :style="{width: `${svgWidth}px`, height: `${blockHeight}px`}" @click="i.show = !i.show"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
    import moment from 'moment'
    import { cloneDeep } from 'lodash'
    import contextMenu from 'vue-context-menu'

    export default {
        props: {
            startPeriod: {
                default() {
                    return moment().startOf('week')
                },
            },

            endPeriod: {
                default() {
                    return moment().add(1, 'months')
                },
            },

            autoScale: {
                default: false,
            },

            events: {
                default() {
                    return []
                },
            },

            readOnly: {
                type: Boolean,
                default: false,
            },

            categoryGroupings: {
                type: [Boolean, Object],
                default: false,
            },

            grouping: {
                default: true,
            },

            inifinteScroll: {
                default: false,
            },

            showRepeats: {
                default: true,
            },

            statusColors: {
                type: Object,
                default() {
                    return {
                        complete: '#8bccba',
                        active: '#6bc2e2',
                        in_progress: '#fbbd08',

                    }
                },
            },

            fallbackCategory: {
                type: String,
                default: 'misc',
            },


            defaultObject: {
                type: Object,
                default() {
                    const obj = {}
                    obj[this.fallbackCategory.toLowerCase()] = []
                    return obj
                },
            },
        },

        components: {
            contextMenu,
        },

        data() {
            return {
                hourWidth: 29.1,
                blockHeight: 35,
                scale: 'days',
                scaleWidth: 29.1,
                titleWidth: 0,
                topMargin: 35,
                localSelected: null,
                cloned: null,
                ganttData: [],
            }
        },

        computed: {
            svgWidth() {
                if (this.autoScale) {
                    return '100%'
                }

                if (!this.hourWidth || !this.limits.range) return 0

                return (this.hourWidth * this.limits.range) + 200
            },

            linkPaths() {
                const links = []
                this.ganttData.forEach((group) => {
                    links.push(group.links.map((link) => {
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
                    }))
                })

                return links
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

            limits() {
                const limits = {
                    start: this.startPeriod,
                    actualStart: this.startPeriod,
                    end: this.endPeriod,
                    range: 0,
                    units: this.scale,
                }

                limits.range = Math.ceil(limits.end.diff(limits.start, this.scale))

                return limits
            },

            globalOffset() {
                return this.limits.actualStart.diff(this.limits.start, 'days') - 1
            },

            processedEvents() {
                const processedEvents = this.events.map((curr) => {
                    curr.label = this.getStatusColour(curr)
                    curr.children = []

                    if (!this.showRepeats || !curr.frequency) {
                        return curr
                    }

                    this.processEventRepeats(curr)
                    return curr
                })
                return processedEvents
            },

            getTopMargin() {
                return this.categoryGroupings ? this.topMargin : 0
            },

            gridPatternStyles() {
                return {
                    marginTop: `${this.getTopMargin}px`,
                    marginLeft: `${this.titleWidth}px`,
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${this.scaleWidth * 7}' height='100' viewBox='0 0 ${this.scaleWidth * 7} 100'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.4'%3E%3Cpath opacity='.5' d='M0 0 H 5 V 100 H 0 Z m${this.scaleWidth} 0 h 1 V 100 h -1 Z m${this.scaleWidth} 0 h 1 V 100 h -1 Z m${this.scaleWidth} 0 h 1 V 100 h -1 Z m${this.scaleWidth} 0 h 1 V 100 h -1 Z m${this.scaleWidth} 0 h 1 V 100 h -1 Z m${this.scaleWidth} 0 h 1 V 100 h -1 Z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }
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
            processEventRepeats(curr) {
                switch (curr.frequency.key) {
                case 'daily':
                    curr.children = this.addRepeats(curr, 1, 'days')
                    break

                case 'every_work_day':
                    curr.children = this.addRepeats(curr, 1, 'every_work_day')
                    break

                case 'weekly':
                    curr.children = this.addRepeats(curr, 1, 'weeks')
                    break

                case 'four_weekly':
                    curr.children = this.addRepeats(curr, 4, 'weeks')
                    break

                case 'fortnightly':
                    curr.children = this.addRepeats(curr, 2, 'weeks')
                    break

                case 'monthly':
                    curr.children = this.addRepeats(curr, 1, 'months')
                    break

                case 'quarterly':
                    curr.children = this.addRepeats(curr, 1, 'quarters')
                    break

                default:
                }
                return curr
            },

            getStatusColour(event) {
                return this.statusColors[event.status] ? this.statusColors[event.status] : this.statusColors.active
            },

            processGroupedData(titleGroupings, links) {
                const startObj = cloneDeep(this.categoryGroupings && this.categoryGroupings !== true ? this.categoryGroupings : this.defaultObject)
                const fallbackCategory = this.fallbackCategory.toLowerCase()

                const processNodes = this.processedEvents.reduce((grouped, item, i, array, sortKey = item.group_by) => {
                    if (this.categoryGroupings === true && sortKey) {
                        grouped[sortKey] = grouped[sortKey] || []
                    }

                    const computedSortKey = grouped[sortKey] ? sortKey : fallbackCategory

                    if (computedSortKey === fallbackCategory && !grouped[computedSortKey]) {
                        grouped[computedSortKey] = []
                    }

                    const group = grouped[computedSortKey]
                    if (group.indexOf(item) === -1) group.push(item)

                    titleGroupings[computedSortKey] = titleGroupings[computedSortKey] || []
                    let index = titleGroupings[computedSortKey].indexOf(item.title.toLowerCase())
                    if (index === -1) {
                        index = titleGroupings[computedSortKey].length
                        titleGroupings[computedSortKey].push(item.title.toLowerCase())
                    }

                    this.getChildPositions(item, index)

                    item.event_index = this.grouping ? index : i

                    this.getItemLinks(computedSortKey, item, links)

                    this.position(item)

                    return grouped
                }, startObj)
                return processNodes
            },

            buildGanttData() {
                const titleGroupings = cloneDeep(this.defaultObject)
                const links = cloneDeep(this.defaultObject)
                const processedGroupedData = this.processGroupedData(titleGroupings, links)

                const clonedGanttData = cloneDeep(this.ganttData)
                const filteredGroups = this.getFilteredGroups(processedGroupedData)

                this.ganttData = Object.keys(filteredGroups).map(group => ({
                    title: group,
                    links: links[group] || [],
                    blocks: filteredGroups[group],
                    groupings: titleGroupings[group],
                    show: clonedGanttData.length && clonedGanttData.map(g => g.title).indexOf(group) > -1 ? clonedGanttData[clonedGanttData.map(g => g.title).indexOf(group)].show : true,
                    height: titleGroupings[group].length * (this.blockHeight),
                }))
            },

            getItemLinks(computedSortKey, item, links) {
                if (!item.dependencies) return []

                links[computedSortKey] = links[computedSortKey] || []
                item.dependencies.map((dep) => {
                    links[computedSortKey].push([
                        this.events[dep],
                        item,
                    ])

                    return dep
                })
                return links[computedSortKey]
            },

            getChildPositions(item, index) {
                if (!(this.showRepeats && item.children && item.children.length)) return {}
                item.children.map((ch) => {
                    ch.event_index = index
                    this.position(ch)
                    return ch
                })
                return item
            },

            getFilteredGroups(processNodes) {
                if (!processNodes) return []

                const filteredGroups = {}

                Object.keys(processNodes).forEach((prop) => {
                    if (prop !== this.fallbackCategory && processNodes[prop].length) { filteredGroups[prop] = processNodes[prop] }
                })

                if (!processNodes[this.fallbackCategory] || (processNodes[this.fallbackCategory] && !processNodes[this.fallbackCategory].length)) return filteredGroups

                filteredGroups.misc = processNodes.misc
                return filteredGroups
            },

            openContext(e, block, $index) {
                this.localSelected = block

                if (this.$refs.ctxMenu.length > 1) {
                    this.$refs.ctxMenu.forEach((menu) => {
                        menu.ctxVisible = false
                    })
                }
                this.$refs.ctxMenu[$index].open(e)

                this.$nextTick(() => {
                    this.$refs.ctxMenu[$index].ctxLeft = e.offsetX
                    this.$refs.ctxMenu[$index].ctxTop = e.offsetY
                })
            },

            collide(e) {
                this.$emit('load-more', e)
            },

            position(event) {
                event.page = event.page || 1
                event.x = (((event.offset + this.globalOffset) + ((event.page - 1) * 30)) * this.scaleWidth) + this.titleWidth
                event.width = event.duration * this.scaleWidth
                event.height = this.blockHeight - 15
                event.y = (event.event_index * this.blockHeight) + 7.5 + this.getTopMargin
                return event
            },

            select(block) {
                this.localSelected = block
                this.$emit('left-click-selected', block)
                if (this.readOnly) {
                    this.$emit('selected', block)
                }
            },

            adjustStart(block, evt) {
                if (evt.which === 3 || this.readOnly || block.readOnly) return
                this.startMouse = evt
                this.dragging = 'start'
                this.localSelected = block
                this.cloned = cloneDeep(this.localSelected)
            },

            adjustEnd(block, evt) {
                if (evt.which === 3 || this.readOnly || block.readOnly) return
                this.startMouse = evt
                this.dragging = 'end'
                this.localSelected = block
                this.cloned = cloneDeep(this.localSelected)
            },

            move(evt) {
                if (!this.dragging) return

                const diff = Math.round((evt.clientX - this.startMouse.clientX) / this.scaleWidth)

                if (Math.abs(diff)) {
                    if (this.dragging === 'start') {
                        this.cloned.offset += diff
                        this.cloned.starts_at = moment(this.cloned.starts_at).add(diff, 'days').format('YYYY-MM-DD')
                    } else {
                        this.cloned.duration += diff
                    }

                    this.cloned.ends_at = moment(this.cloned.ends_at).add(diff, 'days').format('YYYY-MM-DD')
                    this.position(this.cloned)
                    this.localSelected.offset = this.cloned.offset
                    this.localSelected.starts_at = this.cloned.starts_at
                    this.localSelected.duration = this.cloned.duration

                    this.localSelected.x = this.cloned.x
                    this.localSelected.width = this.cloned.width

                    this.startMouse = {
                        clientX: this.startMouse.clientX + (diff * this.scaleWidth),
                    }
                }
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

                    const start = moment(newEvent.start).add(i, actualUnit)
                    const end = moment(newEvent.end)

                    if (interval > 0) { end.add(i, actualUnit) }

                    if (units === 'every_work_day') {
                        while (start.day() === 0 || start.day() === 6) {
                            start.add(1, 'days')
                            end.add(1, 'days')
                            i += 1
                        }
                    }

                    newEvent.start = start.format('YYYY-MM-DD')
                    newEvent.end = end.format('YYYY-MM-DD')
                    newEvent.offset = moment(this.limits.start).add(newEvent.offset, 'days').add(i, actualUnit).diff(moment(this.limits.start), 'days')

                    eventList.push(newEvent)
                }
                return eventList
            },
        },

        mounted() {
            this.buildGanttData()
        },

        watch: {
            processedEvents: 'buildGanttData',
        },
    }
</script>

<style lang="scss" scoped>
    $header-border-size: 1px;
    $header-border-colour: #eceaef;
    $header-caret-colour: #666666;
    $row-border: solid $header-border-size $header-border-colour;
    $white: #ffffff;

    .rows rect {
        fill: $white
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
        padding-top: 35px;
        overflow: hidden;
        border-right: 5px solid rgba(200, 200, 200, 1);
        min-width: 300px;
    }

    #timeline-container {
        overflow-x: auto;
        margin-top: 0;
    }

    #timeline-dates {
        display: flex;
        margin-top: 13px;
    }

    #timeline {
        width: 100%;
        display: block;
        padding-bottom: 2em;
        overflow-x: scroll;
    }
    #event-types {
        width: 300px;
        flex: 0 0 auto;
    }
    #timeline-content {
        flex: 1 1 auto;
        overflow: auto;
    }
    #timeline-events {
        overflow: visible;
    }
    #timeline-index {
        height:30px;
    }
    #adpcalendar {
        overflow: hidden;
        margin-bottom: 20px;
        display: flex;
    }

    .category-header-wrapper {
        display: flex;
        flex-direction: column;
        justify-content: center;
        border: $row-border;
    }

    .category-header {
        display: flex;
        align-items: center;
        padding: 0 10px;

        font-weight: 800;
        text-transform: capitalize;

        cursor: pointer;

        .title {
            flex-grow: 1;
        }

        .caret {
            flex-grow: 0;
            font-size: 2rem;
            color: $header-caret-colour;
            transform: scale(1, 1.3);

            &.collapsed {
                transform: scale(1.3, 1) rotate(90deg);
            }
        }
    }

     .closed-bar {
        background-color: #f5f5f5;
        border:  $row-border;
    }

    .grid-pattern {
        width: 100%;
    }

    text.icon {
        font-family: Icons;
        color: $white;
        text-shadow: 0 0 1px rgba(0,0,0,0.5);
    }

    .ctx-menu-container {
        position: relative;
        margin-top: -25px;
        margin-left: 5px;
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
