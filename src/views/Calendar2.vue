<script>
import { defineComponent, ref } from 'vue'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'

let eventGuid = 0
let todayStr = new Date().toISOString().replace(/T.*$/, '') // YYYY-MM-DD of today

console.log("todayStr==",todayStr);

export const INITIAL_EVENTS = [
  {
    id: createEventId(),
    title: 'All-day event',
    start: todayStr
  },
  {
    id: createEventId(),
    title: 'Timed event',
    start: todayStr + 'T12:00:00'
  }
]

export function createEventId() {
  return String(eventGuid++)
}

export default defineComponent({
  components: {
    FullCalendar,
  },
  data() {
    return {
      calendarOptions: {
        plugins: [
          dayGridPlugin,
          timeGridPlugin,
          interactionPlugin // needed for dateClick
        ],
        headerToolbar: {
          left: 'prev,next today myPrev',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        initialView: 'dayGridMonth',
        initialEvents: INITIAL_EVENTS, // alternatively, use the `events` setting to fetch from a feed
        // locale: 'kr',
        editable: true,
        selectable: true,
        selectMirror: true,
        dayMaxEvents: true,
        weekends: true,
        select: this.handleDateSelect, //신규 일정 생성
        eventClick: this.handleEventClick, //기존 일정 선택
        eventsSet: this.handleEventsSet,  //모든 이밴트 감지
        eventAdd: this.handleEventAdd,  //데이타 생성시 발생 이밴트
        eventChange: this.handleEventChange, //데이타 변경시 발생 이밴트
        eventRemove: this.handleEventRemove, //데이타 삭제시 발생 이밴트
        viewDidMount: this.handleEventViewDidMount,
        /* you can update a remote database when these fire:
        eventAdd:
        eventChange:
        eventRemove:
        */
        customButtons: {
          myPrev: {
            text: "<",
            click: function () {
            // FullCalendar API 가져오기
            const calendarApi = this.getApi(); // 여기서 `this`는 캘린더 객체를 참조
            console.log("현재 뷰:", calendarApi.view.type);
            console.log("시작 날짜:", calendarApi.view.activeStart);
            console.log("종료 날짜:", calendarApi.view.activeEnd);

            // 추가 작업 예시: 이전 뷰로 이동
            calendarApi.prev();            },
            
          },
        },       
      },
      currentEvents: [],
    }
  },
  methods: {
    handleWeekendsToggle() {
      this.calendarOptions.weekends = !this.calendarOptions.weekends // update a property
    },
    handleEventViewDidMount(info) {
      console.log("handleEventViewDidMount info == ", info);
    },
    handleEventChange(info) {
      console.log("handleEventChange id == ", info.event.id);
      console.log("handleEventChange title == ", info.event.title);
      console.log("handleEventChange start == ", info.event.start);
      console.log("handleEventChange end == ", info.event.end);
    },
    handleEventRemove(info) {
      console.log("handleEventRemove id == ", info.event.id);
      console.log("handleEventRemove title == ", info.event.title);
      console.log("handleEventRemove start == ", info.event.start);
      console.log("handleEventRemove end == ", info.event.end);
    },
    handleDateSelect(selectInfo) {
      let title = prompt('일정을 입력하세요.');
      let calendarApi = selectInfo.view.calendar;

      calendarApi.unselect() // clear date selection

      if (title) {
        calendarApi.addEvent({
          id: createEventId(),
          title,
          start: selectInfo.startStr,
          end: selectInfo.endStr,
          allDay: selectInfo.allDay
        })
      }
    },
    handleEventClick(clickInfo) {
      if (confirm(`선택한 일정을 삭제 하시겠습니까?'${clickInfo.event.title}'`)) {
        clickInfo.event.remove()
      }
    },
    handleEventsSet(events) {
      this.currentEvents = events;
      console.log("handleEventsSet events == ", events);

     events.forEach(event => {
        console.log(`ID: ${event.id}, 제목: ${event.title}, 시작: ${event.start}, 시작: ${event.view}`);
      });

      // 예: 서버로 현재 이벤트 목록 동기화
      /*
      const eventData = events.map(event => ({
        id: event.id,
        title: event.title,
        start: event.start,
        end: event.end
      }));

      fetch('/sync-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      }).then(response => {
        if (!response.ok) {
          console.error('서버와 동기화 실패!');
        } else {
          console.log('서버와 동기화 완료!');
        }
      });
      */
    },
    handleEventAdd(info) {
      console.log("handleEventAdd title == ", info.event.title);
      console.log("handleEventAdd start == ", info.event.start);
      console.log("handleEventAdd end == ", info.event.end);
    },
  }
})
</script>
<template>
  <FullCalendar :options="calendarOptions" />
</template>