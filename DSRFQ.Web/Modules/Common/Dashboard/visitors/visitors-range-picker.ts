import { notifyInfo } from "@serenity-is/corelib";
import daterangepicker from "daterangepicker";
import "daterangepicker/daterangepicker.css";
import moment from "moment";

export const visitorsRangePicker = (el: HTMLButtonElement) => {
    new daterangepicker(el, {
        alwaysShowCalendars: true,
        opens: "left",
        ranges: {
            'Today': [moment(), moment()],
            'Yesterday': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
            'Last 7 Days': [moment().subtract(6, 'days'), moment()],
            'Last 30 Days': [moment().subtract(29, 'days'), moment()],
            'This Month': [moment().startOf('month'), moment().endOf('month')],
            'Last Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]
        },
        startDate: moment().subtract(29, 'days'),
        endDate: moment()
    }, function (start: any, end: any) {
        notifyInfo("You chose: " + start.format('MMMM D, YYYY') + ' - ' + end.format('MMMM D, YYYY'));
    });
}