(() => {
    const Version = '1.0.0';

    const Message = {
        submit: 'screening-question-apply',
    }

    shazamme
        .style(`https://sdk.shazamme.io/js/plugin/screening-question/${Version}/plugin.css`)
        .then();

    shazamme.plugin = {
        ...shazamme.plugin,

        salaryFilter(w, o) {
            let sender = this;

            o = o || {};

            this.onChange = (cb) => {
                this._afterChange = cb;

                return this;
            }

            this.min = () => {
                return o.min || this._defaultMin;
            }

            this.max = () => {
                return o.max || this._defaultMax;
            }

            this.step = () => {
                return o.step || this._defaultStep;
            }

            this.set = (vals) => {
                if (!isNaN(vals.min)) {
                    this._lowerSlider.val(vals.min);
                }

                if (!isNaN(vals.max)) {
                    this._upperSlider.val(vals.max);
                }

                this._adjustColorRange();
                this._adjustRangeDisplay();
                this._setSalary();

                return this;
            }

            this.renderTo = (parent) => {
                this._el = $(`
                    <div class="control-salary-slider" data-rel="salary-slider">
                        <div class="slider">
                           <input class="range" data-rel="range-set-lower" type="range" min="${this.min()}" max="${this.max()}" value="${this.min()}" step="${this.step()}">
                             <span class="section-color" data-rel="range-color"></span>
                           <input class="range" data-rel="range-set-upper" type="range" min="${this.min()}" max="${this.max()}" value="${this.max()}" step="${this.step()}">
                       </div>
                       <div class="label-display" data-rel="salary-display"></div>
                    </div>
                `);

                parent.find('[data-rel=salary-slider]').remove();
                parent.append(this._el);

                this._lowerSlider = this._el.find('[data-rel=range-set-lower]'); //Lower value slider
                this._upperSlider = this._el.find('[data-rel=range-set-upper]'); //Upper value slider
                this._rangeColor = this._el.find('[data-rel=range-color]'); //Range color

                this._addHandlers();
                this._adjustRangeDisplay();

                return this;
            }

            this._defaultMin = 0;
            this._defaultMax = parseInt(data.config.salaryRangeMax) || 500000;
            this._defaultStep = parseInt(data.config.salaryRangeStep) || 1000;

            this._formatter = Intl.NumberFormat(navigator.language);
            this._setSalaryTimeout = null;
            this._afterChange = undefined;

            this._addHandlers = function() {
                this._upperSlider.on("input", function() {
                   let lowerVal = parseInt(sender._lowerSlider.val()) || 0; //Get lower slider value
                   let upperVal = parseInt(sender._upperSlider.val()) || 0; //Get upper slider value
                   let step = parseInt(sender._upperSlider.attr("step"));

                   //If the upper value slider is LESS THAN the lower value slider plus one.
                   if (upperVal < lowerVal + step) {
                      //The lower slider value is set to equal the upper value slider minus one.
                      sender._lowerSlider.val(upperVal - step);
                      //If the lower value slider equals its set minimum.
                      if (lowerVal == sender._lowerSlider.attr("min")) {
                         //Set the upper slider value to equal 1.
                         sender._upperSlider.val(step);
                      }
                   }

                    sender._adjustColorRange();
                    sender._adjustRangeDisplay();
                    sender._setSalary();
                });

                this._lowerSlider.on("input", function() {
                   let lowerVal = parseInt(sender._lowerSlider.val()) || 0; //Get lower slider value
                   let upperVal = parseInt(sender._upperSlider.val()) || 0; //Get upper slider value
                   let step = parseInt(sender._upperSlider.attr("step"));

                   //If the lower value slider is GREATER THAN the upper value slider minus one.
                   if (lowerVal > upperVal - step) {
                      //The upper slider value is set to equal the lower value slider plus one.
                      _upperSlider.val(lowerVal + step);

                      //If the upper value slider equals its set maximum.
                      if (upperVal == sender._upperSlider.attr("max")) {
                         //Set the lower slider value to equal the upper value slider's maximum value minus one.
                         sender._lowerSlider.val(parseInt(sender._upperSlider.attr("max")) - step);
                      }

                   }

                    sender._adjustColorRange();
                    sender._adjustRangeDisplay();
                    sender._setSalary();
                });
            }

            this._adjustColorRange = function() {
               //Setting the margin left of the middle range color.
               //Taking the value of the lower value times 10 and then turning it into a percentage.
               sender._rangeColor.css({
                    marginLeft: (sender._lowerSlider.val() / parseInt(sender._lowerSlider.attr("max")) * 100) + '%',
                    width: (sender._upperSlider.val() / parseInt(sender._upperSlider.attr("max")) * 100) - (sender._lowerSlider.val() / parseInt(sender._lowerSlider.attr("max")) * 100) + '%',
               });
            }

            this._adjustRangeDisplay = function() {
                sender._el.find("[data-rel=salary-display]").text(`${sender._formatter.format(parseInt(sender._lowerSlider.val()))} - ${sender._formatter.format(parseInt(sender._upperSlider.val()))}`);
            }

            this._setSalary = function() {
                if (sender._setSalaryTimeout) {
                    clearTimeout(sender._setSalaryTimeout);
                }

                sender._setSalaryTimeout = setTimeout(function() {
                    if (typeof(sender._afterChange) === 'function') {
                           sender._afterChange(sender, {
                               min: parseInt(sender._lowerSlider.val()), //Get lower slider value
                               max: parseInt(sender._upperSlider.val()), //Get upper slider value
                           });
                    }

                    sender._setSalaryTimeout = null;
                }, 1000);
            }
        }
    }
});

