import Vue from 'vue'
import moment from 'moment'
import Gantt from '.../../../src/components/Gantt'

const Constructor = Vue.extend(Gantt)
Vue.use(moment)

const vm = new Constructor({
    propsData: {
        events: [
            {
                title: 'Line One',
                offset: moment().diff(moment().startOf('month').startOf('week'), 'days'),
                duration: 4,
                status: 'complete',
                x: 0,
                width: 0,
                readOnly: true,
                group_by: '',
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
                group_by: 'foo',
            },
            {
                title: 'Dependent Event',
                offset: moment().diff(moment().startOf('month').startOf('week'), 'days') + 5,
                duration: 2,
                frequency: {
                    key: 'weekly',
                },
                dependencies: [], // [0, 1],
                status: 'active',
                x: 0,
                width: 0,
                group_by: 'bar',
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
                group_by: 'bar',
            },
        ],
    },
}).$mount()

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
        event: { status: 'blah' },
        expectedOutput: vm.statusColors.active,
    },
}

describe('test', () => {
    describe('test', () => {
        it('should match', () => {
            expect('test').toEqual('test')
        })
    })

    describe('getChildPositions', () => {
        it('sets the event_index and calls the position method for each child event', () => {
            const checkPositionCalled = jest.spyOn(vm, 'position')

            const index = 5
            const result = vm.getChildPositions(vm.processedEvents[1], index)

            expect(result).toMatchSnapshot()
            expect(result.children[0].event_index).toBe(5)

            expect(checkPositionCalled).toHaveBeenCalledTimes(result.children.length)
            expect(checkPositionCalled).toHaveBeenCalledWith(result.children[0])
        })
    })

    describe('position', () => {
        it('sets the position data on an event', () => {
            const result = vm.position(vm.events[0])

            expect(result).toMatchSnapshot()
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

    describe('getItemLinks', () => {
        it('gets linked events', () => {
            const links = { misc: [] }
            vm.processedEvents.forEach((event) => {
                vm.getItemLinks(event.group_by, event, links)
            })
            Vue.nextTick(() => {
                expect(links).toMatchSnapshot()
            })
        })
    })
})
