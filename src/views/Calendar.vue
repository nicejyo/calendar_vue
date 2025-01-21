<template>
  <div>
    <FullCalendar ref="calendarRef" :options="calendarOptions" />
  </div>
</template>

<script>
import { ref, provide, reactive } from "vue";
import FullCalendar from "@fullcalendar/vue3";
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import calendarService from '@/service/CalendarService.js'

let todayStr = new Date().toISOString().replace(/T.*$/, ''); // YYYY-MM-DD of today

const state = reactive({
      events :[],
      inputs:{
        id: "",
        title: "",
        start: "",
        end: "",
        allDay: true,
      }
    });

export default {
  components: { FullCalendar },
  setup() {

    const calendarRef = ref(null);

    provide("calendarApi", calendarRef);

    const calendarOptions = {
      plugins: [
          dayGridPlugin,
          timeGridPlugin,
          interactionPlugin // needed for dateClick
        ],
      initialView: "dayGridMonth",
      headerToolbar: {
        left: 'myPrev,myNext myToday',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay'
      },
      initialView: 'dayGridMonth',
      titleFormat: function (date) {
        return date.date.year + '년 ' + (parseInt(date.date.month) + 1) + '월';
      },
      views: {
        timeGridWeek: {
          slotLabelFormat: { hour: '2-digit', minute: '2-digit', hour12: false }, // 24시간제
        },
        timeGridDay: {
          slotLabelFormat: { hour: '2-digit', minute: '2-digit', hour12: false }, // 24시간제
        },
      },
      events: state.events,
      editable: true,
      selectable: true,
      selectMirror: true,
      dayMaxEvents: true,
      weekends: true,
      customButtons: {
        myPrev: {
          text: "<",
          async click() {
            const calendarApi = calendarRef.value.getApi();

            const today = calendarApi.view.activeStart;
            const day = today.toISOString().replace(/T.*$/, '');

            calendarApi.prev();

            ReLoadEvents(day);
          },
        },
        myNext: {
          text: ">",
          async click() {
            const calendarApi = calendarRef.value.getApi();
            const today = calendarApi.view.activeEnd;
            const day = today.toISOString().replace(/T.*$/, '');
            calendarApi.next();

            ReLoadEvents(day);
          },
        },
        myToday: {
          text: "Today",
          async click() {
            const calendarApi = calendarRef.value.getApi();
            calendarApi.today();
            const today = calendarApi.getDate();
            const day = today.toISOString().replace(/T.*$/, '');

            ReLoadEvents(day);
          },
        },
      },
      //신규 일정 생성
      select: async (selectInfo) => {
            let title = prompt('일정을 입력하세요.');
            let calendarApi = selectInfo.view.calendar;
            //const calendarApi = calendarRef.value.getApi();

            calendarApi.unselect() // clear date selection

            if (title) {
              //console.log(`selectInfo.startStr = ${selectInfo.startStr} endStr = ${selectInfo.endStr} allDay = ${selectInfo.allDay}`);

              let getId = await calendarService.getId();

              console.log(`getId == ${getId}`);

              calendarApi.addEvent({
                id: getId,
                title,
                start: selectInfo.startStr,
                end: selectInfo.endStr,
                allDay: selectInfo.allDay
              });
            };
      }, 
      //기존 일정 선택
      eventClick: (clickInfo) => {
        if (confirm(`선택한 일정을 삭제 하시겠습니까? \n['${clickInfo.event.title}']`)) {
          clickInfo.event.remove()
        }
      }, 
      //데이타 생성시 발생 이밴트
      eventAdd: async (info) => {
              state.inputs.title = info.event.title;
              state.inputs.start = info.event.startStr;
              state.inputs.end = info.event.endStr;
              state.inputs.allDay = ((info.event.allDay)?1:0);

              await calendarService.save(info.event);
      },  
      //데이타 변경시 발생 이밴트

      eventChange: async (info) => {
              state.inputs.id = info.event.id;
              state.inputs.title = info.event.title;
              state.inputs.start = info.event.startStr;
              state.inputs.end = info.event.endStr;
              state.inputs.allDay = ((info.event.allDay)?1:0);

              await calendarService.put(info.event);
      },
      //데이타 삭제시 발생 이밴트
      eventRemove: async (info) => {
        await calendarService.delete(info.event.id);
      }, 
      //모든 이밴트 감지
      eventsSet:  () => {
        //console.log("eventsSet loaded");
      },  
    };

    const ReLoadEvents = async (todayStr) => {
      state.events = await calendarService.read(todayStr);

      const calendarApi = calendarRef.value.getApi();
      calendarApi.removeAllEvents();  // 기존 이벤트 제거 (필요한 경우)
      calendarApi.addEventSource(state.events);  // 새로운 이벤트 추가
      calendarApi.render();
      //console.log("state.events", state.events);  // 데이터 확인
    };

    ReLoadEvents(todayStr);

    return {
      calendarRef,
      calendarOptions,
      state,
    };
  },
};

</script>
