import flatpickr from "flatpickr";

export const CalendarCard = ({ }) =>
    <div class="card s-dashboard-card">
        <div class="card-body p-0">
            <div id="calendar" class="s-dashboard-calendar" style="width: 100%" 
                ref={el => setTimeout(() => flatpickr(el, { inline: true }), 0)}>
            </div>
        </div>
        <div class="card-footer py-4">
            <div class="row">
                <div class="col-sm-6">
                    <div class="clearfix">
                        <span class="pull-left">Task #1</span>
                        <small class="float-end">90%</small>
                    </div>
                    <div class="progress xs">
                        <div class="progress-bar progress-bar-green" style="width: 90%;"></div>
                    </div>
                    <div class="clearfix">
                        <span class="pull-left">Task #2</span>
                        <small class="float-end">70%</small>
                    </div>
                    <div class="progress xs">
                        <div class="progress-bar progress-bar-green" style="width: 70%;"></div>
                    </div>
                </div>
                <div class="col-sm-6">
                    <div class="clearfix">
                        <span class="pull-left">Task #3</span>
                        <small class="float-end">60%</small>
                    </div>
                    <div class="progress xs">
                        <div class="progress-bar progress-bar-green" style="width: 60%;"></div>
                    </div>
                    <div class="clearfix">
                        <span class="pull-left">Task #4</span>
                        <small class="float-end">40%</small>
                    </div>
                    <div class="progress xs">
                        <div class="progress-bar progress-bar-green" style="width: 40%;"></div>
                    </div>
                </div>
            </div>
        </div>
    </div >