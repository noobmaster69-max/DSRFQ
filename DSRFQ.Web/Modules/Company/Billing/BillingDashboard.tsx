export const BillingPage = () => (
    <div id="BillingPageContainer">
        <div className={"block1"}>
            <h2 class={"section-title"}>Billing</h2>
        </div>
        <br/>
        <ul class="nav nav-tabs" role="tablist">
            <li class="header"><a class="nav-link active" href="#pane1" data-bs-toggle="tab" aria-selected="false" role="tab">Overview</a></li>
            <li class="nav-item"><a class="nav-link" href="#pane2" data-bs-toggle="tab" aria-selected="false" role="tab">Payment Methods</a></li>
            <li class="nav-item"><a class="nav-link" href="#pane3" data-bs-toggle="tab" aria-selected="false" role="tab">Billing History</a></li>
        </ul>
        <div class={"tab-content"}>
            <div class="tab-pane fade chart-properties-pane" id="pane3" role="tabpanel">
                
            </div>
            <div class="tab-pane fade chart-properties-pane" id="pane2" role="tabpanel">

            </div>
            <div class=" fade  show active" id="pane1" role="tabpanel">
                <div >
                    <p style={{"fontSize":"20px","fontWeight":"bold"}}>Pay as you go</p>
                </div>
                <br/>
                <div>
                    <p style={{"fontSize":"16px","fontWeight":"bold"}}>Credit balance</p>
                </div>
                <div>
                    <p style={{"fontSize":"30px","fontWeight":"bold"}}>$<span id="balance"> 0.00</span></p>
                </div>
                <div style={{"display":"flex","justifyContent":"start","gap":"20px"}}>
                    <button
                        className="btn btn-primary"
                        onClick={() => { window.location.href = "/CheckOut"; }}
                    >
                        Add credit
                    </button>
                </div>
                <div id={"billing-history"}>
                    
                </div>
            </div>
        </div>
    </div>
);
