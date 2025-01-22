<template>
  <div>
    <FullCalendar ref="calendarRef" :options="calendarOptions" />
  </div>
  <!-- 커스텀 팝업 -->
  <div v-if="isPopupOpen" class="popup-overlay">
    <div class="popup">
      <h3>{{ selectedDate }}</h3>

      <!-- 일정 제목 영역 -->
      <span v-if="selectedTitle != null" class="event-title">{{ selectedTitle }}</span>

      <!-- 일정 제목이 없을 때 input 영역 -->
      <div v-if="selectedTitle == null" class="input-container">
        <input
          type="text"
          ref="eventTitleInput"
          v-model="eventTitle"
          @keydown.enter="addEvent"
          placeholder="일정을 입력해 주세요."
        />
      </div>

      <!-- 팝업 버튼들 -->
      <div class="popup-buttons">
        <button v-if="selectedTitle == null" @click="addEvent">등록</button>
        <button v-if="selectedTitle != null" @click="deleteEvent">삭제</button>
        <button @click="closePopup">닫기</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, provide, reactive, nextTick } from "vue";
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
        right: 'dayGridMonth,timeGridWeek'  //,timeGridDay
      },
      initialView: 'dayGridMonth',
      titleFormat: function (date) {
        return date.date.year + '／' + (parseInt(date.date.month) + 1);
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
      longPressDelay : 1, // 터치할 때 누르는 시간 조절
      customButtons: {
        myPrev: {
          text: "〈",
          async click() {
            const calendarApi = calendarRef.value.getApi();

            const today = calendarApi.view.activeStart;
            const day = today.toISOString().replace(/T.*$/, '');

            calendarApi.prev();

            ReLoadEvents(day);
          },
        },
        myNext: {
          text: "〉",
          async click() {
            const calendarApi = calendarRef.value.getApi();
            const today = calendarApi.view.activeEnd;
            const day = today.toISOString().replace(/T.*$/, '');
            calendarApi.next();

            ReLoadEvents(day);
          },
        },
        myToday: {
          text: "Ｄ",
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
      select: (selectInfo) => {
        selectClick(selectInfo);
/*
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
*/            
      }, 
      //기존 일정 선택
      eventClick: (clickInfo) => {
        eventClick(clickInfo.event);

        //if (confirm(`선택한 일정을 삭제 하시겠습니까? \n['${clickInfo.event.title}']`)) {
        //  clickInfo.event.remove()
        //}
      }, 
      //데이타 생성시 발생 이밴트
      eventAdd: async (info) => {
              state.inputs.title = info.event.title;
              state.inputs.start = info.event.startStr;
              state.inputs.end = info.event.endStr;
              state.inputs.allDay = ((info.event.allDay)?1:0);

              await calendarService.save(info.event);
              selectedTitle = null;
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

    // 모바일에서 스크롤 방지
    document.addEventListener('touchmove', function(event) {
      event.preventDefault(); // 기본 동작을 방지 (스크롤을 차단하고 선택만 허용)
    }, { passive: false });

    ReLoadEvents(todayStr);

    // 팝업 상태 관리
    const isPopupOpen = ref(false);
    const eventTitle = ref("");
    let selectedDate = ref(null);
    let selectedTitle = ref(null);

    // 날짜 클릭 시 팝업 열기
    const selectClick = (info) => {
      selectedDate.value = info.startStr; // 선택한 날짜 저장
      eventTitle.value = ""; // 입력 초기화
      isPopupOpen.value = true; // 팝업 열기
      focusInput(); // 팝업이 열릴 때 포커스
    };

    // 이밴트 시 팝업 열기
    const eventClick = (info) => {
      state.inputs.id = info.id;
      state.inputs.title = info.title;
      state.inputs.start = info.start;
      state.inputs.end = info.end;
      state.inputs.allDay = info.allDay;

      let startStr = info.startStr.replace(/T.*$/, '');
      
      if(info.startStr.length > 10){
        startStr = startStr + " ";
        startStr = startStr + info.startStr.match(/T(\d{2}:\d{2})/)[1]; 
        startStr = startStr + "∼";
        startStr = startStr + info.endStr.match(/T(\d{2}:\d{2})/)[1]; 
      }
      
      selectedDate.value = startStr; // 선택한 날짜 저장
      selectedTitle.value = info.title; // 입력 초기화
      isPopupOpen.value = true; // 팝업 열기
    };

    // 이벤트 추가
    const addEvent = async () => {
      if (eventTitle.value.trim()) {

        const calendarApi = calendarRef.value.getApi();
        calendarApi.unselect() // clear date selection

        const getId = await calendarService.getId();

        calendarApi.addEvent({
          id: getId,
          title : eventTitle.value,
          start: selectedDate.value,
          end: selectedDate.value,
          allDay: true,
        });
      }
      closePopup();
    };
    // 이벤트 삭제
    const deleteEvent = () => {
        if (confirm("선택한 일정을 삭제 하시겠습니까?")) {
          const calendarApi = calendarRef.value.getApi();
          const event = calendarApi.getEvents().find(event => event.id === state.inputs.id);

          // 이벤트가 존재하면 삭제
          if (event) {
            event.remove(); // 해당 이벤트 제거
          }
        };

        closePopup();
    };

    // 팝업 닫기
    const closePopup = () => {
      isPopupOpen.value = false;
      eventTitle.value = "";
      selectedDate.value = null;
      selectedTitle.value = null;
    };
    // 팝업이 열릴 때마다 입력 필드에 포커스 주기
    const focusInput = () => {
      nextTick(() => {
        const inputElement = document.querySelector('input');
        if (inputElement) inputElement.focus();
      });
    };

    return {
      calendarRef,
      calendarOptions,
      state,
      isPopupOpen,
      eventTitle,
      selectedDate,
      selectedTitle,
      selectClick,
      eventClick,
      addEvent,
      deleteEvent,
      closePopup,
    };
  },
};
</script>

<style scoped>
/* 팝업 스타일 */
/* 불투명 처리된 배경 */
.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.6); /* 불투명도 조정 (0.6) */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000; /* 다른 요소 위로 */
}

/* 팝업 창 */
.popup {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  width: 300px;
  text-align: center;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  z-index: 1100; /* 팝업을 배경 위로 */
}

/* 일정 제목 스타일 */
.event-title {
  display: block;
  font-size: 1.2rem;
  font-weight: bold;
  margin-bottom: 15px;
  word-wrap: break-word; /* 자동 줄바꿈 */
  white-space: normal;  /* 긴 단어도 잘리지 않고 줄바꿈 */
  word-break: break-word; /* 긴 단어가 잘리지 않도록 */
  color: #333;
  line-height: 1.5;
  text-align: left; /* 왼쪽 정렬 */
  padding: 5px;
  background-color: #f9f9f9;
  border-radius: 5px;
  overflow-wrap: break-word; /* 긴 텍스트도 잘리지 않도록 */
}

/* 입력 필드를 중앙에 위치 */
.input-container {
  display: flex;
  justify-content: center;
  width: 100%;
}

/* 입력 필드 스타일 */
.input-container input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
  font-size: 1rem;
  margin-bottom: 15px;
}

/* 버튼 스타일 */
.popup-buttons {
  display: flex;
  flex-direction: column; /* 세로로 나열 */
  justify-content: center; /* 중앙 정렬 */
  gap: 10px; /* 버튼 간격 */
  margin-top: 20px;
}

.popup-buttons button {
  padding: 10px 15px;
  font-size: 1rem;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.popup-buttons button:hover {
  background-color: #007bff;
  color: white;
}

/* 버튼 기본 스타일 */
.popup-buttons button {
  padding: 0.5rem 1rem;
  border: 2px solid transparent; /* 기본 테두리는 투명하게 설정 */
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s, transform 0.2s, border-color 0.3s;
}

/* 첫 번째 버튼 - Primary 스타일 */
.popup-buttons button:first-child {
  background-color: #007bff;
  color: white;
  border-color: #007bff; /* 기본 테두리 색 */
}

/* 첫 번째 버튼 hover 효과 */
.popup-buttons button:first-child:hover {
  background-color: #0056b3; /* 더 어두운 파란색 */
  border-color: #004494; /* 테두리 강조 */
  box-shadow: 0 0 8px rgba(0, 85, 187, 0.6); /* 외곽선 효과 */
}

/* 첫 번째 버튼 active 효과 */
.popup-buttons button:first-child:active {
  background-color: #004494; /* 더 짙은 파란색 */
  transform: scale(0.95); /* 살짝 눌린 효과 */
}

/* 두 번째 버튼 - Secondary 스타일 */
.popup-buttons button:last-child {
  background-color: #f0f0f0;
  color: black;
  border-color: #d6d6d6; /* 기본 테두리 색 */
}

/* 두 번째 버튼 hover 효과 */
.popup-buttons button:last-child:hover {
  background-color: #d6d6d6; /* 더 어두운 회색 */
  border-color: #b0b0b0; /* 테두리 강조 */
  box-shadow: 0 0 8px rgba(160, 160, 160, 0.6); /* 외곽선 효과 */
}

/* 두 번째 버튼 active 효과 */
.popup-buttons button:last-child:active {
  background-color: #c0c0c0; /* 더 짙은 회색 */
  transform: scale(0.95); /* 살짝 눌린 효과 */
}

/* 반응형 디자인 (모바일 화면에서 팝업 최적화) */
@media (max-width: 768px) {
  .fc-toolbar {
    display: block;
    text-align: center;
  }
  
  .fc-toolbar .fc-left,
  .fc-toolbar .fc-center,
  .fc-toolbar .fc-right {
    display: block;
    width: 100%;
    text-align: center;
  }
  
  .fc-toolbar button {
    font-size: 14px;
    padding: 8px 12px;
    margin: 4px 0; /* 버튼 사이의 간격을 줄입니다 */
  }
}

/* 더 작은 화면에서 텍스트 크기 조정 */
@media (max-width: 480px) {
  .fc-toolbar button {
    font-size: 12px; /* 버튼 크기 줄이기 */
    padding: 6px 10px;
  }
}

@media (max-width: 480px) {
  .popup {
    padding: 15px;
  }
  .event-title {
    font-size: 1rem; /* 모바일에서 폰트 크기 조정 */
  }
  .popup-buttons button {
    font-size: 0.9rem; /* 버튼 폰트 크기 조정 */
  }
  .input-container input {
    font-size: 0.9rem; /* 입력 필드 폰트 크기 조정 */
  }
}
</style>
