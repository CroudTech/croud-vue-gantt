# croud-vue-gantt

> A Vue.js plugin that adds a gantt component to your project

## Installation
You can add this plugin to your project using yarn

```bash
yarn add git@github.com:CroudSupport/croud-vue-gantt.git
```

You can then install the plugin in your Vue application
```js
import Vue from 'vue'
import CroudGantt from 'croud-vue-gantt'

Vue.use(CroudGantt)
```

## Usage
```html
<croud-gantt :events="events"></croud-gantt>
```
### Gantt events
Below is a simple example of a gantt event
```js
    events: [
        {
            title: 'Test', // Title of the event
            offset: 1, // Offset from the first day in the gantt chart
            duration: 4, // Duration in days
            status: 'active', // used for colouring
        }
    ],
```

**Read only**

Add a readOnly flag to the event to display the event but to disable any editing in gantt component

### Repeating events
To show repeating events, add the **show-repeats** prop to your markup
```html
<croud-gantt :events="events" :show-repeats="true"></croud-gantt>
```
And add a frequency key to your event object.
```js
    events: [
        {
            title: 'Test',
            offset: 1,
            duration: 4,
            status: 'active',
            frequency: {
                key: 'weekly',
            },
        }
    ],
```

**Possible frequencies**

- daily
- weekly
- fortnightly
- four_weekly
- monthly
- Quarterly

### Grouping events
To show repeating events, add the **grouping** prop to your markup
```html
<croud-gantt :events="events" :grouping="true"></croud-gantt>
```
Now any events with the same title will be displayed on the same line of the gantt chart.
```js
    events: [
        {
            title: 'Test',
            offset: 1,
            duration: 4,
            status: 'in_progress',
        },
        {
            title: 'Test',
            offset: 5,
            duration: 3,
            status: 'active',
        }
    ],
```

### Dependencies
You can add a dependency array to your event object.

You can add a dependency by adding it's index in the event array. The chart will automatically draw a line between these two events.

```js
    events: [
        {
            title: 'Test',
            offset: 1,
            duration: 4,
            status: 'in_progress',
        },
        {
            title: 'Another',
            offset: 5,
            duration: 3,
            status: 'active',
            dependencies: [0],
        }
    ],
```


### Date ranges
You can also pass in custom start and end dates into the gantt chart by using the **start-period** and **end-period** props.
```html
<croud-gantt :events="events"
             :start-period="startPeriod"
             :end-period="endPeriod" />
```

```js
data() {
    return {
        startPeriod: moment().startOf('week'),
        endPeriod: moment().add('2', 'month'),
    }
},
```

### Emitted events
**selected(event)**

Emitted on right-click and edit

**update-event(event)**

Emitted when an event is edited on the gantt chart
