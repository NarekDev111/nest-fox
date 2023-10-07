<script setup lang="ts">
import FullCalendar from '@fullcalendar/vue3';
import timeGridPlugin from '@fullcalendar/timegrid';
import { onMounted, reactive, ref } from 'vue';
import * as fc from '@fullcalendar/core';
import { useRoute } from 'vue-router';

const route = useRoute();
const trailId = route.params.id;

type RemoteSlotData = {
    startRuleId: number | null;
    slotId: number;
    datetime: Date;
    stage: string;
};

type RemoteClosureData = {
    id: number;
    name: string;
    dateTimeFrom: string;
    dateTimeTo: string;
};

let cachedSlots: {
    year: number;
    month: number;
    slots: RemoteSlotData[];
}[] = reactive([]);

let cachedClosures: RemoteClosureData[] = reactive([]);

let trailName = ref('');

let calOptions: fc.CalendarOptions = {
    plugins: [timeGridPlugin],
    initialView: 'timeGridWeek',
    headerToolbar: {
        left: undefined,
        center: 'title',
    },
    views: {
        timeGridWeek: {
            locale: 'de-CH',
            slotDuration: '00:20',
            slotMinTime: '08:00:00',
            slotMaxTime: '20:00:00',
            allDaySlot: false,
            slotEventOverlap: true,
            nowIndicator: true,
            slotLabelFormat: {
                hour12: false,
                meridiem: false,
                timeStyle: 'short',
            },
            eventTimeFormat: {
                hour12: false,
                meridiem: false,
                timeStyle: 'short',
            },
            dayHeaderFormat: {
                weekday: 'short',
                day: '2-digit',
            },
        },
    },
    defaultTimedEventDuration: '00:15',
    contentHeight: 'auto',
    firstDay: 1,
    datesSet: (data) => {
        onWeekChange(data);
    },
    eventClick: (info) => {
        info.jsEvent.preventDefault();
        window.open(info.event.url, '_blank');
    },
    events: [],
};

onMounted(async () => {
    const response = await fetch(`https://shop-api.foxtrail.run/public/trail/${trailId}`);
    const trail = await response.json();
    trailName.value = trail.name;
});

function applyCacheToCalendarOptions() {
    let events = cachedSlots
        .flatMap((cachedSlot) => cachedSlot.slots)
        .map((slot) => {
            const date = new Date(slot.datetime);
            const backgroundColor = slot.stage === 'available' ? '#86efac' : '#fde047';
            return {
                url: `https://directus.foxtrail.run/admin/content/slot/${slot.slotId}`,
                title: slot.stage,
                start: date,
                color: backgroundColor,
                textColor: 'black',
            } as fc.EventInput;
        });

    events.push(
        ...cachedClosures.map((closure) => {
            return {
                url: `https://directus.foxtrail.run/admin/content/closure/${closure.id}`,
                title: 'Geschlossen',
                start: closure.dateTimeFrom,
                end: closure.dateTimeTo,
                color: '#fca5a5',
                textColor: 'black',
            } as fc.EventInput;
        }),
    );

    options.events = events;
}

const options = reactive(calOptions);

async function onWeekChange(data: fc.DatesSetArg) {
    // Check if the month of 'start' or 'end' is already cached
    const startMonth = data.start.getMonth() + 1;
    const endMonth = data.end.getMonth() + 1;
    const startYear = data.start.getFullYear();
    const endYear = data.end.getFullYear();
    const startCached = cachedSlots.find((cachedSlot) => cachedSlot.month === startMonth && cachedSlot.year === startYear);
    const endCached = cachedSlots.find((cachedSlot) => cachedSlot.month === endMonth && cachedSlot.year === endYear);

    if (!startCached || !endCached) {
        const month = !startCached ? startMonth : endMonth;
        const year = !startCached ? startYear : endYear;
        console.log('Found uncached month');
        (await getSlots(month, year)).forEach((slot) => {
            const date = new Date(slot.datetime);
            cachedSlots.push({
                year: date.getFullYear(),
                month: date.getMonth() + 1,
                slots: [slot],
            });
        });
        (await getClosures(startYear)).forEach((closure) => {
            const exists = cachedClosures.find((cachedClosure) => cachedClosure.id === closure.id && cachedClosure.dateTimeFrom === closure.dateTimeFrom);
            if (!exists) {
                cachedClosures.push(closure);
            }
        });
        applyCacheToCalendarOptions();
    }
}

async function getSlots(month: number, year: number): Promise<RemoteSlotData[]> {
    try {
        console.log(`Fetching slots for ${month}/${year}`);
        const response = await fetch(`https://shop-api.foxtrail.run/public/slot?year=${year}&month=${month}&trailID=${trailId}`);
        return await response.json();
    } catch (e) {
        console.log('oops');
        console.log(e);
    }
    return [];
}

async function getClosures(year: number): Promise<RemoteClosureData[]> {
    try {
        console.log(`Fetching closures for ${year}`);
        const response = await fetch(`https://shop-api.foxtrail.run/public/closure?year=${year}&trailID=${trailId}`);
        return await response.json();
    } catch (e) {
        console.log('oops');
        console.log(e);
    }
    return [];
}
</script>
<template>
    <div class="py-5">
        <h1 class="text-4xl font-bold transform origin-top-left">{{ trailName }}</h1>
    </div>
    <div class="">
        <FullCalendar :options="options" />
    </div>
</template>

<style></style>
