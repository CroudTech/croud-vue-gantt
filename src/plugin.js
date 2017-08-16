const Gantt = require('./components/Gantt.vue')

module.exports = {
    install(Vue) {
        Vue.component('croud-gantt', Gantt)
    },
}
