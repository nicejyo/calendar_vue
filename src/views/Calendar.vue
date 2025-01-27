<template>
  <div class="calendar-container">
    <FullCalendar ref="calendarRef" :options="calendarOptions" />
  </div>
  <!-- 커스텀 팝업 -->
  <div v-if="isPopupOpen" class="popup-overlay">
    <div class="popup">
      <h3>{{ selectedDate }}</h3>

      <!-- 일정 제목 영역 -->
      <span v-if="selectedTitle !== null" class="event-title">{{ selectedTitle }}</span>

      <!-- 일정 제목이 없을 때 input 영역 -->
      <div v-if="selectedTitle === null" class="input-container">
        <input
          type="text"
          ref="eventTitleInput"
          v-model="eventTitle"
          @keydown.enter="selectAddEvent"
          placeholder="일정을 입력해 주세요."
        />
      </div>

      <!-- 팝업 버튼들 -->
      <div class="popup-buttons">
        <button v-if="selectedTitle === null" @click="selectAddEvent">등록</button>
        <button v-if="selectedTitle !== null" @click="deleteEvent">삭제</button>
        <button @click="closePopup">닫기</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, provide, reactive, nextTick, onMounted, onBeforeUnmount } from "vue";
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
    // 팝업 상태 관리
    const isPopupOpen = ref(false);
    const eventTitle = ref("");
    const selectedDate = ref(null);
    const selectedTitle = ref(null);
    // 터치 드레그 관리
    const touchStartX = ref(0);
    const touchEndX = ref(0);
    const isDraggingEvent = ref(false);
    const headerHeight = ref(0); // 헤더 높이를 저장
    const reminders = ref([]); // 알림 타이머 관리

    provide("calendarApi", calendarRef);

    const calendarOptions = {
      plugins: [
          dayGridPlugin,
          timeGridPlugin,
          interactionPlugin // needed for dateClick
        ],
      initialView: "dayGridMonth",
      //contentHeight: 'auto', // 동적 높이 설정
      scrollTime: '08:00:00',
      events: state.events,
      editable: false,
      selectable: true,
      selectMirror: true,
      eventStartEditable: true,
      eventDurationEditable: true,
      dayMaxEvents: true,
      weekends: true,
      longPressDelay: 500, // 터치 드래그를 위한 길게 누르기 지연 시간
      //eventLongPressDelay: 1000, // 일정 드래그 시작 지연 시간  - 미지정시 longPressDelay를 따름
      //selectLongPressDelay: 1000, // 선택을 위한 길게 누르기 지연 시간
      height: '100dvh', // 화면 전체 높이를 기준으로 캘린더를 렌더링
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
          scrollTime: '08:00:00',
          slotLabelFormat: { hour: '2-digit', minute: '2-digit', hour12: false }, // 24시간제
        },
        //timeGridDay: {
        //  slotLabelFormat: { hour: '2-digit', minute: '2-digit', hour12: false }, // 24시간제
        //},
      },
      customButtons: {
        myPrev: {
          text: "〈",
          click: ()=> {
            handleCustomButtonClick("prev");
          },
        },
        myNext: {
          text: "〉",
          click: ()=> {
            handleCustomButtonClick("next");
          },
        },
        myToday: {
          text: "Ｄ",
          click: ()=> {
            handleCustomButtonClick("today");
          },
        },
      },
      eventDidMount: function (eventInfo) {
        //const eventTime = new Date(eventInfo.event.start).toISOString().replace(
        //        /(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}):\d{2}.\d{3}Z/,
        //        '$1 $2'
        //      );
        const eventStart = new Date(eventInfo.event.start).getTime();
        const now = new Date().getTime();

        // 알림 10분 전 설정
        const alramTime = 10;
        const reminderTime = eventStart - alramTime * 60 * 1000;

        if ((reminderTime > now) && (!eventInfo.event.allDay))  {
          // 알림 예약
          const timerId = setTimeout(() => {
            if (Notification.permission === "granted") {
              new Notification(` ${alramTime}분 후에 [ ${eventInfo.event.title} ] 일정이 시작됩니다.`);
            } else {
              Notification.requestPermission().then((permission) => {
                if (permission === "granted") {
                  new Notification(` ${alramTime}분분 후에 [ ${eventInfo.event.title} ] 일정이 시작됩니다.`);
                };
              });
            };
            clearReminder(eventInfo.event.id);
          }, reminderTime - now);

          // reminders 배열에 알림 타이머 저장
          reminders.value.push({ id: eventInfo.event.id, timerId });
        }
      },
      eventDragStart: function(info) {
        //console.log('Drag started on mobile:', info.event);
      },
      eventDragStop: function(info) {
        //console.log('Drag stopped on mobile:', info.event);
      },
      windowResize: function(view) {
        const calendarApi = calendarRef.value?.getApi(); // calendarApi 가져오기
        if (!calendarApi) return; // calendarApi가 정의되지 않았으면 종료

        if (window.innerWidth < 768) {
            document.querySelector('.fc-scroller').style.maxHeight = '100dvh';
            document.querySelector('.fc-scroller').style.overflowY = 'auto';
        };
      },
      datesSet: function(info) {
        const scrollerEl = document.querySelector('.fc-scroller');
        if (scrollerEl) {
          scrollerEl.style.overflowY = 'auto';
          scrollerEl.style.webkitOverflowScrolling = 'touch'; // iOS 호환
        }
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
        eventOpenClick(clickInfo.event);

        //if (confirm(`선택한 일정을 삭제 하시겠습니까? \n['${clickInfo.event.title}']`)) {
        //  clickInfo.event.remove()
        //}
      }, 
      //데이타 생성시 발생 이밴트
      eventAdd: (info) => {
        handleEventChangeOrAdd(info, true);
      },  
      //데이타 변경시 발생 이밴트
      eventChange: (info) => {
        handleEventChangeOrAdd(info, false);
      },
      //데이타 삭제시 발생 이밴트
      eventRemove: async (info) => {
        await calendarService.delete(info.event.id);
        selectedTitle.value = null;
      }, 
      //모든 이밴트 감지
      eventsSet:  () => {
      },
    };

    const handleCustomButtonClick = (action) => {
      const calendarApi = calendarRef.value.getApi();
      let day = "";
      
      if(action === "prev"){
        const today = calendarApi.view.activeStart;
        day = today.toISOString().replace(/T.*$/, '');
        calendarApi.prev();
      }else if(action === "next"){
        const today = calendarApi.view.activeEnd;
        day = today.toISOString().replace(/T.*$/, '');
        calendarApi.next()
      }else if(action === "today"){
        calendarApi.today();
        const today = calendarApi.getDate();
        day = today.toISOString().replace(/T.*$/, '');
      }else{
        return;
      };

      ReLoadEvents(day);
    };

    const ReLoadEvents = async (todayStr) => {
      state.events = await calendarService.read(todayStr);

      const calendarApi = calendarRef.value.getApi();
      calendarApi.removeAllEvents();  // 기존 이벤트 제거 (필요한 경우)
      calendarApi.addEventSource(state.events);  // 새로운 이벤트 추가
      //calendarApi.render(); //이벤트가 추가될 때 자동으로 호출
    };

    ReLoadEvents(todayStr);

    // 특정 알림 타이머 제거
    const clearReminder = (eventId) => {
      const reminderIndex = reminders.value.findIndex(r => r.id === eventId);
      if (reminderIndex > -1) {
        clearTimeout(reminders.value[reminderIndex].timerId); // 타이머 제거
        reminders.value.splice(reminderIndex, 1); // 배열에서 알림 삭제
      }
    };

    // 날짜 클릭 시 팝업 열기
    const selectClick = (info) => {
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
      eventTitle.value = ""; // 입력 초기화
      isPopupOpen.value = true; // 팝업 열기
      // 팝업 열기 코드
      document.body.style.overflow = 'hidden'; // 스크롤 막기
      focusInput(); // 팝업이 열릴 때 포커스
    };

    // 이밴트 시 팝업 열기
    const eventOpenClick = (info) => {
      state.inputs.id = info.id;
      state.inputs.title = info.title;
      state.inputs.start = info.start;
      state.inputs.end = info.end;
      state.inputs.allDay = info.allDay;

      let startStr = info.startStr.replace(/T.*$/, '');
      
      if(info.startStr.length > 10){
        startStr = startStr + " ";
        startStr = startStr + info.startStr.match(/T(\d{2}:\d{2})/)[1]; 
      }
      if(info.endStr.length > 10){
        startStr = startStr + "∼";
        startStr = startStr + info.endStr.match(/T(\d{2}:\d{2})/)[1]; 
      }
      
      selectedDate.value = startStr; // 선택한 날짜 저장
      selectedTitle.value = state.inputs.title; // 입력 초기화

      isPopupOpen.value = true; // 팝업 열기
      // 팝업 열기 코드
      document.body.style.overflow = 'hidden'; // 스크롤 막기
    };

    // 이벤트 추가
    const selectAddEvent = async () => {
      if (eventTitle.value.trim()) {

        const calendarApi = calendarRef.value.getApi();
        calendarApi.unselect() // clear date selection

        const getId = await calendarService.getId();

        calendarApi.addEvent({
          id: getId,
          title : eventTitle.value,
          start: state.inputs.start,
          end: state.inputs.end,
          allDay: state.inputs.allDay,
        });
      }
      closePopup();
    };
    // 이벤트 저장 및 수정
    const handleEventChangeOrAdd = async (info, isAdd = true) => {
      state.inputs.id = info.event.id;
      state.inputs.title = info.event.title;
      state.inputs.start = info.event.startStr;
      state.inputs.end = info.event.endStr;
      state.inputs.allDay = (info.event.allDay ? 1 : 0);

      if (isAdd) {
          await calendarService.save(state.inputs);
      } else {
          await calendarService.put(state.inputs);
      }
      selectedTitle.value = null;
      calendarRef.value.getApi().unselect();
      calendarRef.value.getApi().destroy();
      calendarRef.value.getApi().render();
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
      // 팝업 열기 코드
      document.body.style.overflow = ''; // 스크롤 막기
      eventTitle.value = "";
      selectedDate.value = null;
      selectedTitle.value = null;
      //캘린더를 완전히 초기화해
      calendarRef.value.getApi().destroy();
      calendarRef.value.getApi().render();
      //calendarRef.value.getApi().refetchEvents(); //이벤트 데이터만 업데이트하려면
    };
    // 팝업이 열릴 때마다 입력 필드에 포커스 주기
    const focusInput = () => {
      nextTick(() => {
        const inputElement = document.querySelector('input');
        if (inputElement) inputElement.focus();
      });
    };

    // 화면 리사이징 시 FullCalendar 리사이즈
    window.addEventListener('resize', () => {
      nextTick(() => {
        if (calendarRef.value) {
          calendarRef.value.getApi().updateSize();
        }
      });
    });

    // 터치 이벤트 핸들러
    const handleTouchStart = (event) => {
      // 터치 시작 위치
      const touchY = event.touches[0].clientY;

      // 헤더 영역에서 터치가 시작되었는지 확인
      if (touchY < headerHeight.value) {
        isDraggingEvent.value = true;  //swipe가 처리되지 않도록 이밴트 드래그 중으로 설정
        return; // 헤더 영역이면 동작 중단
      };
      
      touchStartX.value = event.touches[0].clientX;

      // 이벤트 드래그 여부 확인
      const targetElement = event.target;
      isDraggingEvent.value = targetElement.closest('.fc-event') !== null;
    };

    const handleTouchMove = (event) => {
      touchEndX.value = event.touches[0].clientX;
    };

    const handleTouchEnd = () => {
      if (isDraggingEvent.value) {
        // 이벤트 드래그 중일 경우 스와이프 처리 중단
        return;
      }

      const swipeDistance = touchStartX.value - touchEndX.value;
      const screenWidth = window.innerWidth;

      // 스와이프 시작 및 끝 위치가 화면의 양 끝 부분(10% 이내)인지 확인
      const startInEdge = touchStartX.value < screenWidth * 0.45 || touchStartX.value > screenWidth * 0.55;
      const endInEdge = touchEndX.value < screenWidth * 0.45 || touchEndX.value > screenWidth * 0.55;

      if (startInEdge && endInEdge) {
        // 스와이프 거리에 따라 prev/next 호출
        if (swipeDistance > 50) {
          handleCustomButtonClick("next");
          //calendarRef.value.getApi().next(); // 다음 달로 이동
          //calendarRef.value.getApi().refetchEvents();
          //calendarRef.value.getApi().render();
        } else if (swipeDistance < -50) {
          handleCustomButtonClick("prev");
          //calendarRef.value.getApi().prev(); // 이전 달로 이동
          //calendarRef.value.getApi().refetchEvents();
          //calendarRef.value.getApi().render();
        }
      };
    };

    // 이벤트 리스너 등록 및 해제
    onMounted(() => {
      const calendarEl = calendarRef.value.$el;

      // 헤더 높이 계산
      const headerEl = calendarEl.querySelector('.fc-header-toolbar');
      if (headerEl) {
        headerHeight.value = headerEl.offsetHeight; // 헤더 높이를 저장
      }

      calendarEl.addEventListener('touchstart', handleTouchStart);
      calendarEl.addEventListener('touchmove', handleTouchMove);
      calendarEl.addEventListener('touchend', handleTouchEnd);
    });

    onBeforeUnmount(() => {
      const calendarEl = calendarRef.value.$el;

      calendarEl.removeEventListener('touchstart', handleTouchStart);
      calendarEl.removeEventListener('touchmove', handleTouchMove);
      calendarEl.removeEventListener('touchend', handleTouchEnd);
    });

    return {
      calendarRef,
      calendarOptions,
      state,
      isPopupOpen,
      eventTitle,
      selectedDate,
      selectedTitle,
      selectClick,
      eventOpenClick,
      selectAddEvent,
      deleteEvent,
      closePopup,
      handleEventChangeOrAdd,
    };
  },
};
</script>

<style scoped>
/* 키보드가 열릴 때 뷰포트 조정 방지 */
html, body {
  height: 100dvh;
  width: 100%;
  overflow: hidden; /* 스크롤 방지 */
  margin: 0;
  padding: 0;
  position: relative;
}
.calendar-container {
  position: fixed; /* 고정 위치 설정 */
  top: 0; /* 화면 상단에 고정 */
  left: 0; /* 화면 왼쪽에 고정 */
  width: 100vw; /* 화면 전체 너비 사용 */
  height: 100dvh; /* 화면 전체 높이 사용 */
  z-index: 1000; /* 다른 콘텐츠보다 위에 표시 */
  overflow: hidden; /* 화면을 벗어나는 영역을 숨김 */
}
/* 팝업 스타일 */
/* 불투명 처리된 배경 */
.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100dvh;
  background-color: rgba(0, 0, 0, 0.6); /* 불투명도 조정 (0.6) */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999 !important; /* 다른 요소 위로 */
}
.popup {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%); /* 팝업을 정확히 중앙에 배치 */
  width: 90%;
  max-width: 350px;
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  z-index: 1100;
  max-height: calc(100dvh - 100px); /* 화면에 키보드가 나타나더라도 크기를 제한 */
  overflow-y: auto;
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
/* 터치 스크롤을 허용 */

/* 헤더 부분의 z-index를 낮춰서 팝업과 충돌하지 않게 설정 */
.fc-toolbar {
  z-index: 10; /* 헤더의 z-index 값을 낮춰 팝업과의 충돌을 방지 */
}
.fc-timegrid {
  height: 100%; /* 높이를 100%로 설정 */
  overflow-y: auto; /* 수직 스크롤 허용 */
  -webkit-overflow-scrolling: touch; /* 부드러운 스크롤 */
  touch-action: pan-y; /* 수직 스크롤만 가능하도록 설정 */
}
.fc-timegrid-body {
  overflow-y: auto; /* 수직 스크롤 허용 */
  -webkit-overflow-scrolling: touch; /* 부드러운 스크롤 */
}


</style>
