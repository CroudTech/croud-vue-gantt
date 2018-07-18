import Vue from 'vue'
import moment from 'moment'
import { cloneDeep } from 'lodash'
import Gantt from '.../../../src/components/Gantt'

const Constructor = Vue.extend(Gantt)
Vue.use(moment)

const vm = new Constructor({
    propsData: {
        events: [
            {
                title: 'Line One',
                offset: moment('16/07/2018', 'DD/MM/YYYY').diff(moment().startOf('month').startOf('week'), 'days'),
                duration: 3,
                status: 'complete',
                x: 0,
                width: 0,
                readOnly: true,
                group_by: '',
            },
            {
                title: 'Line Two',
                offset: moment('16/07/2018', 'DD/MM/YYYY').diff(moment().startOf('month').endOf('week'), 'days'),
                duration: 2,
                frequency: {
                    key: 'weekly',
                },
                status: 'active',
                x: 0,
                width: 0,
                readOnly: false,
                group_by: '',
            },
            {
                title: 'Line Three',
                offset: moment('16/07/2018', 'DD/MM/YYYY').diff(moment().startOf('month').endOf('week'), 'days') + 5,
                duration: 3,
                status: 'in_progress',
                x: 0,
                width: 0,
                readOnly: false,
                group_by: '',
            },
            {
                title: 'Line four',
                offset: moment('16/07/2018', 'DD/MM/YYYY').diff(moment().startOf('month').endOf('week'), 'days') + 10,
                duration: 4,
                dependencies: [1],
                status: '',
                x: 0,
                width: 0,
                readOnly: false,
                group_by: '',
            },
            {
                title: 'A New Event',
                offset: moment('16/07/2018', 'DD/MM/YYYY').diff(moment().startOf('month').startOf('week'), 'days') + 3,
                duration: 2,
                frequency: {
                    key: 'weekly',
                },
                dependencies: [],
                status: 'in_progress',
                x: 0,
                width: 0,
                group_by: 'foo',
            },
            {
                title: 'Dependent Event',
                offset: moment('16/07/2018', 'DD/MM/YYYY').diff(moment().startOf('month').startOf('week'), 'days') + 5,
                duration: 2,
                frequency: {
                    key: 'weekly',
                },
                dependencies: [],
                status: 'active',
                x: 0,
                width: 0,
                group_by: 'bar',
            },
            {
                title: 'Another Event',
                offset: moment('16/07/2018', 'DD/MM/YYYY').diff(moment().startOf('month').startOf('week'), 'days') + 7,
                duration: 4,
                frequency: {
                    key: 'once',
                },
                dependencies: [5],
                status: 'active',
                x: 0,
                width: 0,
                group_by: 'bar',
            },
        ],
    },
}).$mount()

const checkPositionCalled = jest.spyOn(vm, 'position')

const statusColourTests = {
    'status active': {
        event: { status: 'active' },
        expectedOutput: vm.statusColors.active,
    },
    'status in_progress': {
        event: { status: 'in_progress' },
        expectedOutput: vm.statusColors.in_progress,
    },
    'status complete': {
        event: { status: 'complete' },
        expectedOutput: vm.statusColors.complete,
    },
    'status doesnt exist, provide fallback': {
        event: { status: 'doesnt exist' },
        expectedOutput: vm.statusColors.active,
    },
}

const processEventRepeatsTests = {
    daily: {
        event: { frequency: { key: 'daily' } },
        every: 1,
        period: 'days',
    },
    every_work_day: {
        event: { frequency: { key: 'every_work_day' } },
        every: 1,
        period: 'every_work_day',
    },
    weekly: {
        event: { frequency: { key: 'weekly' } },
        every: 1,
        period: 'weeks',
    },
    four_weekly: {
        event: { frequency: { key: 'four_weekly' } },
        every: 4,
        period: 'weeks',
    },
    fortnightly: {
        event: { frequency: { key: 'fortnightly' } },
        every: 2,
        period: 'weeks',
    },
    monthly: {
        event: { frequency: { key: 'monthly' } },
        every: 1,
        period: 'months',
    },
    quarterly: {
        event: { frequency: { key: 'quarterly' } },
        every: 1,
        period: 'quarters',
    },
}

const getFilteredGroupsTests = {
    'has a misc group and an empty group, should return 3 groups': {
        misc: [
            { id: 1, name: 'misc event 1' },
            { id: 2, name: 'misc event 2' },
            { id: 3, name: 'misc event 3' },
        ],
        firstGroup: [
            { id: 1, name: 'first group event 1' },
            { id: 2, name: 'first group event 2' },
        ],
        secondGroup: [],
        thirdGroup: [
            { id: 1, name: 'third group event 1' },
        ],
    },
    'has an empty misc group, and an empty group, should return 2 groups': {
        misc: [],
        firstGroup: [],
        secondGroup: [
            { id: 1, name: 'second group event 1' },
            { id: 1, name: 'second group event 1' },
        ],
        thirdGroup: [
            { id: 1, name: 'third group event 1' },
        ],
    },
    'doesnt have a misc group, should return one group': {
        firstGroup: [
            { id: 1, name: 'first group event 1' },
            { id: 2, name: 'first group event 2' },
        ],
    },
    'has no groups, should return an empty object': {},
}

describe('Build up data methods/computed props for ganttData', () => {
    describe('processEventRepeats', () => {
        Object.keys(processEventRepeatsTests).forEach((test) => {
            it(test, () => {
                const testProps = processEventRepeatsTests[test]
                const addRepeatsSpy = jest.spyOn(vm, 'addRepeats')
                vm.processEventRepeats(testProps.event)

                expect(addRepeatsSpy).toHaveBeenCalledWith(testProps.event, testProps.every, testProps.period)
            })
        })
    })

    describe('processedEvents computed prop', () => {
        it('it sets the label field', () => {
            Vue.nextTick(() => {
                vm.processedEvents.forEach((event) => {
                    expect(event.label).toBe(vm.getStatusColour(event))
                })
            })
        })

        it('it doesnt set the event children if showRepeats prop is false', () => {
            vm.showRepeats = false
            Vue.nextTick(() => {
                vm.processedEvents.forEach((event) => {
                    expect(event.children.length).toBe(0)
                })
            })
        })

        it('it sets the event children if showRepeats is true and the frequency key is not once', () => {
            vm.showRepeats = true
            Vue.nextTick(() => {
                vm.processedEvents.forEach((event) => {
                    if (event.frequency && event.frequency.key && event.frequency.key !== 'once') {
                        expect(event.children.length).not.toBe(0)
                    } else {
                        expect(event.children.length).toBe(0)
                    }
                })
            })
        })
    })

    describe('getItemLinks', () => {
        it('if item has no dependencies, return an empty array', () => {
            const item = { title: 'no dependencies' }

            const result = vm.getItemLinks('group', item, {})
            Vue.nextTick(() => {
                expect(result).toEqual([])
            })
        })

        it('gets linked events for each event with dependencies', () => {
            const links = cloneDeep(vm.defaultObject)
            vm.processedEvents.forEach((event) => {
                vm.getItemLinks(event.group_by, event, links)
            })
            Vue.nextTick(() => {
                expect(links).toMatchSnapshot()
            })
        })
    })

    describe('getStatusColour', () => {
        Object.keys(statusColourTests).forEach((test) => {
            it(test, () => {
                const result = vm.getStatusColour(statusColourTests[test].event)
                expect(result).toBe(statusColourTests[test].expectedOutput)
            })
        })
    })

    describe('position', () => {
        it('sets the position data on an event', () => {
            const output = vm.processedEvents
            output.forEach((e) => {
                vm.position(e)
                expect(e.page).toBeGreaterThanOrEqual(1)
                expect(e.x).toBeGreaterThan(0)
                expect(e.width).toBeGreaterThan(0)
                expect(e.height).toBeGreaterThan(0)
                expect(e.y).toBeGreaterThan(0)
            })
            Vue.nextTick(() => {
                expect(output).toMatchSnapshot()
            })
        })
    })

    describe('getChildPositions', () => {
        it('if showRepeats is false, return an empty object', () => {
            vm.showRepeats = false
            const index = 5

            checkPositionCalled.mockClear()
            const result = vm.getChildPositions(vm.processedEvents[1], index)

            expect(result).toEqual({})
            expect(result.children).toBeFalsy()
            expect(checkPositionCalled).not.toBeCalled()
        })

        it('if an item doesnt have any children, return an empty object', () => {
            vm.showRepeats = true
            const index = 5

            checkPositionCalled.mockClear()
            const result = vm.getChildPositions(vm.processedEvents[0], index)

            expect(result).toEqual({})
            expect(result.children).toBeFalsy()
            expect(checkPositionCalled).not.toBeCalled()
        })

        it('sets the event_index and calls the position method for each child event', () => {
            const index = 5

            checkPositionCalled.mockClear()
            const result = vm.getChildPositions(vm.processedEvents[1], index)

            expect(result).toMatchSnapshot()
            expect(result.children[0].event_index).toBe(5)
            expect(checkPositionCalled).toHaveBeenCalledTimes(result.children.length)
            expect(checkPositionCalled).toHaveBeenCalledWith(result.children[0])
        })
    })

    describe('getFilteredGroups', () => {
        it('if processNodes is empty, it returns an empty object', () => {
            const filteredGroups = vm.getFilteredGroups([])
            expect(filteredGroups).toEqual({})
            expect(filteredGroups).toMatchSnapshot()
        })

        Object.keys(getFilteredGroupsTests).forEach((test) => {
            it(test, () => {
                const filteredGroups = vm.getFilteredGroups(getFilteredGroupsTests[test])
                expect(filteredGroups).toMatchSnapshot()
            })
        })

        it('it adds the misc group at the end of the object', () => {
            const groups = {
                misc: [
                    { id: 1, name: 'misc event 1' },
                ],
                firstGroup: [
                    { id: 1, name: 'first group event 1' },
                    { id: 2, name: 'first group event 2' },
                ],
                secondGroup: [],
                thirdGroup: [
                    { id: 1, name: 'third group event 1' },
                ],
            }

            const filteredGroups = vm.getFilteredGroups(groups)

            const objectKeys = Object.keys(filteredGroups)
            expect(objectKeys[objectKeys.length - 1]).toBe(vm.fallbackCategory)
        })
    })

    describe('processGroupedData', () => {
        it('provides all events in the fallbackCategory group if categoryGroupings is false (default)', () => {
            vm.categoryGroupings = false
            const titleGroupings = cloneDeep(vm.defaultObject)
            const links = cloneDeep(vm.defaultObject)

            const result = vm.processGroupedData(titleGroupings, links)
            Vue.nextTick(() => {
                expect(Object.keys(result).length).toBe(1)
                expect(result[vm.fallbackCategory]).toBeTruthy()
                expect(result).toMatchSnapshot()
            })
        })

        it('provides events in groups defined by the events group_by field if defined or the fallback category', () => {
            vm.categoryGroupings = true
            const titleGroupings = cloneDeep(vm.defaultObject)
            const links = cloneDeep(vm.defaultObject)

            const result = vm.processGroupedData(titleGroupings, links)
            Vue.nextTick(() => {
                Object.keys(titleGroupings).forEach((expectedGroup) => {
                    expect(result[expectedGroup]).toBeTruthy()
                })

                expect(Object.keys(result).length).toBe(Object.keys(titleGroupings).length)
                expect(result).toMatchSnapshot()
            })
        })

        it('provides events in groups defined by categoryGroupings prop, if an event group doesnt exist, events are placed in the fallback category', () => {
            vm.categoryGroupings = { bar: [] }
            const titleGroupings = cloneDeep(vm.categoryGroupings)
            const links = cloneDeep(vm.categoryGroupings)

            const result = vm.processGroupedData(titleGroupings, links)

            const expectedGroups = cloneDeep(vm.categoryGroupings)
            expectedGroups[vm.fallbackCategory] = []

            Vue.nextTick(() => {
                Object.keys(expectedGroups).forEach((expectedGroup) => {
                    expect(result[expectedGroup]).toBeTruthy()
                })

                expect(Object.keys(result).length).toBe(Object.keys(expectedGroups).length)
                expect(result).toMatchSnapshot()
            })
        })
    })

    describe('buildGanttData', () => {
        vm.categoryGroupings = true
        vm.buildGanttData()

        vm.ganttData.forEach((group) => {
            it('sets each groups title', () => {
                expect(group.title.length).not.toBe(0)
            })

            it('provides each groups links array', () => {
                expect(group.links).toBeTruthy()
            })

            it('provides each groups events array', () => {
                expect(group.blocks.length).not.toBe(0)
            })

            it('provides each groups array of titles', () => {
                expect(group.groupings.length).not.toBe(0)
            })

            it('sets each groups show property as true', () => {
                expect(group.show).toBe(true)
            })

            it('sets each groups height', () => {
                const expectedHeight = group.groupings.length * (vm.blockHeight)
                expect(group.height).toBe(expectedHeight)
            })
        })

        it('maps data ready for rendering on the gantt', () => {
            expect(vm.ganttData).toMatchSnapshot()
        })

        it('it retains group show property when called on exisiting data', () => {
            vm.ganttData[vm.ganttData.length - 1].show = false

            vm.buildGanttData()

            expect(vm.ganttData[vm.ganttData.length - 1].show).toBe(false)
        })
    })
})
