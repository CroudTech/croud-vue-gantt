import Vue from 'vue'
import Gantt from '.../../../src/components/Gantt'

const Constructor = Vue.extend(Gantt)

const vm = new Constructor({
    propsData: {
    },
}).$mount()

describe('test', () => {
    //
    describe('test', () => {
        it('should match', () => {
            expect('test').toEqual('test')
        })
    })
    //
})
