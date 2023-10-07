import { DateAdapter, Rule } from './rschedule';
import { Prisma } from '@prisma/client';
import moment from 'moment/moment';

export default class RuleHelper {
    static buildStartRule(startRule: { time: string | Date; date_from: string | Date; date_to: string | Date | null | undefined; weekdays: string[] | Prisma.JsonValue }): Rule {
        startRule.weekdays = (startRule.weekdays as string[]) ?? [];

        // Fill with all
        if (startRule.weekdays.length === 0) {
            startRule.weekdays = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
        }
        const dateFrom = moment.utc(startRule.date_from);
        const dateTo =
            startRule.date_to != null //
                ? moment.utc(startRule.date_to)
                : undefined;
        // HH:mm:ss
        const time =
            startRule.time instanceof Date //
                ? moment.utc(startRule.time).format('HH:mm:ss')
                : startRule.time;

        const byDayOfWeek = (startRule.weekdays as string[]).map((weekday) => {
            const dateAdapterWd = DateAdapter.WEEKDAYS.find((day) => day == weekday);
            if (dateAdapterWd !== undefined) {
                return dateAdapterWd;
            } else {
                throw Error('Weekday is undefined!');
            }
        });

        return new Rule({
            frequency: 'DAILY',
            byDayOfWeek: byDayOfWeek,
            start: dateFrom,
            byHourOfDay: [parseInt(time.split(':')[0]) as DateAdapter.Hour],
            byMinuteOfHour: [parseInt(time.split(':')[1]) as DateAdapter.Minute],
            bySecondOfMinute: [0],
            byMillisecondOfSecond: [0],
            end: dateTo,
        });
    }

    static validateStartRule(startRule: { time: string | Date; date_from: string | Date; date_to: string | Date | null | undefined; weekdays: string[] | Prisma.JsonValue }): string[] {
        const errors: string[] = [];
        if (startRule.date_from == undefined) {
            errors.push('The date_from is undefined!');
        }
        if (startRule.time === undefined) {
            errors.push('time is not defined!');
        }
        //check if closed time from is before closed time until
        const dateFrom = moment.utc(startRule.date_from).format('YYYY-MM-DD');
        const dateTo = moment.utc(startRule.date_to).format('YYYY-MM-DD');
        if (moment.utc(dateFrom, 'YYYY-MM-DD').isAfter(moment.utc(dateTo, 'YYYY-MM-DD'))) {
            errors.push('The date_from is after the date_to!');
        }
        return errors;
    }
}
