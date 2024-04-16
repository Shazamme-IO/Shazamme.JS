(() => {
    const Version = '1.0.0';

    const Message = {
        submit: 'screening-question-job-adder-apply',
    }

    shazamme
        .style(`https://sdk.shazamme.io/js/plugin/screening-question-job-adder/${Version}/plugin.css`)
        .then();

    shazamme.plugin = {
        ...shazamme.plugin,

        screeningQuestions: (w, o) => {
            const candidateID = o?.candidateID;
            const collection = o?.collection || {};
            const config = o?.config || {};
            const container = o?.container || $(`<div data-rel="screening-fields"></div>`);
            const editing = o?.editing === true;
            const jid = o?.jid;
            const sender = this;

            this.pageNumber = 0;
            this.isValid = true;

            const nextPage = () => {
                this._showQuestions(this.pageNumber + 1);
            }

            const prevPage = () => {
                this._showQuestions(this.pageNumber - 1);
            }

            const answers = () => {
                let d = [];

                this._recordAnswers();

                for (let i in this._answers) {
                    d.push(this._answers[i]);
                }

                return d;
            }

            const loadAnswers = (id) =>
                shazamme.site()
                    .then( s => shazamme.submit({
                            'action': 'Get Screening Answers - JA',
                            'siteID': s.siteID,
                            'jobApplicationID': id,
                    }) )
                    .then( a => {
                        let answers = [];

                        a?.response?.items?.forEach( i => {
                            answers[i.screeningQuestionID] = i;
                        });

                        this._answers = answers;
                        this._restoreAnswers();

                        return Promise.resolve(answers);
                    });

            const knockout = (answers) => {
                return true;
            }

            const validate = () => {
                let isOk = true;

                container.find('input[required], select[required]').each( (i, el) => {
                    let field = $(el);

                    switch (field.attr('data-qtype')) {
                        case 'text':
                        case 'select': {
                            let val = field.val();

                            isOk = isOk && val && val.trim().length > 0;
                            break;
                        }

                        case 'bool': {
                            isOk = isOk && field.is(':checked');
                            break;
                        }

                        case 'number': {
                            isOk = isOk && !isNaN(field.val());
                            break;
                        }

                        case 'date': {
                            let val = Date.parse(field.val());

                            isOk = isOk && !isNaN(val);
                            break;
                        }

                        case 'check-list':
                        case 'radio': {
                            isOk = isOk && container.find(`input[type=radio][name=${field.attr('name')}]`).is(':checked');
                            break;
                        }

                        case 'file': {
                            isOk = isOk && field.get(0).files.length > 0;
                            break;
                        }
                    }
                });

                return isOk;
            }

            this._pages = [];
            this._maxPage = 0;
            this._answers = [];
            this._screeningTemplateID = undefined;

            this._fetchQuestions = () => {

                return new Promise( resolve => {
                    (editing && !jid && Promise.resolve(JSON.parse('{"pages": 1,"items":[{"jAScreeningQuestionID": "b81b532d-38d4-4eae-8c8b-425c9820ea7a","jobID": "3ba79e50-215e-456e-8fad-e7c8d68088d7","question": "How old are you?","isMandatory": true,"isMultiSelect": false,"answerType": "Text","index": 2,"jascreeningquestionanswer": null},{"jAScreeningQuestionID": "5b609ea6-54a5-4926-9706-970b92a23bef","jobID": "3ba79e50-215e-456e-8fad-e7c8d68088d7","question": "What is your gender","isMandatory": true,"isMultiSelect": false,"answerType": "List","index": 3,"jascreeningquestionanswer":[{"jAScreeningQuestionAnswerID": "98dc8df8-0473-4833-9d92-91a7b928e7f6","sort": 0,"value": "Male","jobID": "3ba79e50-215e-456e-8fad-e7c8d68088d7","index": 3},{"jAScreeningQuestionAnswerID": "b143ad1a-31d0-464f-92c4-39a07c9c4bac","sort": 1,"value": "Female","jobID": "3ba79e50-215e-456e-8fad-e7c8d68088d7","index": 3}]},{"jAScreeningQuestionID": "761e252e-cfa2-4ca6-82b5-95f33e36379c","jobID": "3ba79e50-215e-456e-8fad-e7c8d68088d7","question": "Where do you live?","isMandatory": true,"isMultiSelect": false,"answerType": "Text","index": 4,"jascreeningquestionanswer": null},{"jAScreeningQuestionID": "70b15595-ebf0-49c5-a867-5758239c977e","jobID": "3ba79e50-215e-456e-8fad-e7c8d68088d7","question": "Select any of the following","isMandatory": true,"isMultiSelect": true,"answerType": "List","index": 5,"jascreeningquestionanswer":[{"jAScreeningQuestionAnswerID": "398ded85-a711-40dd-bd32-21378c76cf18","sort": 0,"value": "One","jobID": "3ba79e50-215e-456e-8fad-e7c8d68088d7","index": 5},{"jAScreeningQuestionAnswerID": "6359e9ad-ec68-476d-90a0-5717541c3ad3","sort": 1,"value": "Two","jobID": "3ba79e50-215e-456e-8fad-e7c8d68088d7","index": 5},{"jAScreeningQuestionAnswerID": "6113d191-e77f-4ff6-a40d-40be5eb1a48b","sort": 2,"value": "Three","jobID": "3ba79e50-215e-456e-8fad-e7c8d68088d7","index": 5}]}]}')))
                        || shazamme.fetch(collection.questions)
                    .then( r => Promise.resolve(r?.filter( i => i.data.jobID === jid )) )
                    .then( r => {
                        if (r?.length > 0) {
                            if (!sender._pages[0]) sender._pages[0] = [];
                            sender._pages[0] = sender._pages[0].concat(r.map( i => i.data ));
                        }

                        resolve();
                    });
                });
            }

            this._showQuestions = (page, scrollIntoView=true) => {
                if (page > this.pageNumber && !validate()) {
                    alert("Please answer all questions");
                    return;
                }

                this._recordAnswers();

                if (page > this._maxPage) {
                    this._maxPage = page;
                }

                let el = (this._pages[page] || [])
                    .filter( q => !q.parentQuestionID || sender._answers[q.parentQuestionID] )
                    .map( q => sender._questionEl({
                        ...q,
                        options: q.jascreeningquestionanswer?.filter( o => !q.parentQuestionID || sender._answers[q.parentQuestionID].answerUUID?.indexOf(o.parentOptionID) >= 0) || [],
                    }));

                container
                    .empty()
                    .append(el)
                    .append(sender._pagingElements(page))

                container
                    .find('.sq-help-text[collapsible]')
                    .each(function(_, i) {
                        let helpText = $(i);
                        let height = $(helpText).outerHeight();

                        helpText
                            .find('.text-main')
                            .attr('style', `--shaz-help-text-lines: ${config.helpTextLines || 3}`);

                        if (helpText.outerHeight() < height) {
                            helpText
                                .addClass('collapsible')
                                .on('click', '[data-rel=button-show-more]', function() {
                                    let button = $(this);

                                    if (helpText.hasClass('expanded')) {
                                        helpText
                                            .find('.text-main')
                                            .css({
                                            display: '-webkit-box',
                                        });

                                        helpText.removeClass('expanded');
                                    } else {
                                        helpText
                                            .find('.text-main')
                                            .css({
                                            display: 'block',
                                        });

                                        helpText.addClass('expanded');
                                    }
                                });
                        }
                    });

                container
                    .find('[data-rel=screening-page-index]')
                    .click( function() {
                        let page = parseInt($(this).attr("data-page")) || 0;

                        sender._showQuestions(page);
                    });

                if (this._pages[page]?.find( q => q.parentQuestionID )) {
                    container
                        .find('input, select')
                        .on('change', function() {
                            sender._recordAnswers();
                            sender._showQuestions(page, false);
                        });
                }

                container
                    .find('[data-rel=screening-apply]')
                    .click( function() {
                        if (!validate()) {
                            alert("Please answer all questions");
                            return;
                        }

                        shazamme.pub(Message.submit);
                    });

                if (scrollIntoView) {
                    container.get(0).scrollIntoView();
                    window.scrollBy({top: -200, behavior: 'smooth'});
                }

                this._restoreAnswers();
                this.pageNumber = page;
            }

            this._questionEl = (q) => {
                switch (q.answerType) {
                    case 'Text':
                        return `
                             <div class="input-field-container">
                                <label class="text ${q.isMandatory ? 'required' : ''}">
                                    ${q.question}
                                </label>
                                ${q.helpText?.length > 0 ?
                                    `<div class="sq-help-text" ${q.isHelpTextCollapse ? 'collapsible' : ''}>
                                        <p class="text-main">${q.helpText || ''}</p>
                                        <div class="section-read-more" style="text-align: ${config.readMoreAlign}">
                                            <a href="javascript: void(0);" class="button-show-more" data-rel="button-show-more">${config.showMoreHelpText}</a>
                                        </div>
                                    </div>`
                                : ''}
                                <input class="sq-input-text-style" type="text" maxlength=${q.length || -1} autocomplete="nope" data-qtype="text" data-qid="${q.jAScreeningQuestionID}" ${q.isMandatory ? 'required' : ''} />
                            </div>
                        `;

                    case 'List': {
                        let opts = q.options.map( o => `<label class="sq-question-option"><input type="${q.isMultiSelect ? 'checkbox' : 'radio'}" name="${q.jAScreeningQuestionID}" data-qtype="${q.isMultiSelect ? 'check-list' : 'radio'}" data-qid="${q.jAScreeningQuestionID}" data-value="${o.jAScreeningQuestionAnswerID}" ${q.isMandatory ? 'required' : ''} />${o.value}</label>`);

                        return `
                             <div class="input-field-container">
                                <label class="text ${q.isMandatory ? 'required' : ''}">
                                    ${q.question}
                                </label>
                                ${q.helpText?.length > 0 ?
                                    `<div class="sq-help-text" ${q.isHelpTextCollapse ? 'collapsible' : ''}>
                                        <p class="text-main">${q.helpText || ''}</p>
                                        <div class="section-read-more" style="text-align: ${config.readMoreAlign}">
                                            <a href="javascript: void(0);" class="button-show-more" data-rel="button-show-more">${config.showMoreHelpText}</a>
                                        </div>
                                    </div>`
                                : ''}
                                ${opts.join('')}
                             </div>
                        `;
                    }

                    default: return '';
                }


            }

            this._pagingElements = (page) => {
                let out = [];

                out.push("<div data-rel='screening-pages' class='screening-pages-container'>");

                if (page > 0) {
                    out.push(`<a href='javascript:void(0);' class="button-page-nav back" data-rel='screening-page-index' data-page='${page-1}'>Back</a>`);
                }

                if (this._pages.length > 0 && page < this._pages.length - 1)  {
                    out.push(`<a href='javascript:void(0);' class="button-page-nav forward" data-rel='screening-page-index' data-page='${page+1}'>Next</a>`);
                } else if (config.showApply) {
                    out.push(`<a href='javascript:void(0);' class="button-page-nav forward apply" data-rel='screening-apply'>Apply</a>`);
                }

                if (this._pages.length > 1) {
                    let buttons = new Array(this._maxPage+1);

                    for (let i = 0; i < buttons.length; i++) {
                        buttons[i] = `<a href='javascript:void(0);' class="button-page-index ${i === page ? 'active' : ''}" data-rel='screening-page-index' data-page='${i}'></a>`;
                    }

                    for (let i = buttons.length; i < this._pages.length; i++) {
                        buttons[i] = `<a href='javascript:void(0);' class="button-page-index disabled"></a>`;
                    }

                    out.push(`<div class="sq-pages-index">${buttons.join('')}</div>`);
                }

                out.push('</div>');

                return out.join('');
            }

            this._presentList = (options) => {
                let opts = options.map( o => `
                    <div>
                        <input type="checkbox" data-value="${o.value}" />
                        ${o.label || o.option}
                    </div>
                `);

                let dialog = `
                    <div data-rel="dialog-answer-list">
                        <div class="list-options">${ops.join('')}</div>
                        <input type="button">OK</button>
                    </div>
                `;

                $(dialog).appendTo($(element));
            }

            this._recordAnswers = () => {

                container.find('input, select').each( (i, el) => {
                    let field = $(el);

                    switch (field.attr('data-qtype')) {
                        case 'text': {
                            sender._answers[field.attr('data-qid')] = {
                                jobAppJaSqID: shazamme.uuid(),
                                jAScreeningQuestionID: field.attr('data-qid'),
                                answer: field.val(),
                            };
                            break;
                        }

                        case 'radio':
                        case 'check-list': {
                            let id = field.attr('data-qid');
                            let a = sender._answers[id]?.listAnswers || [];

                            if (field.is(':checked')) {
                                a.indexOf(field.attr('data-value')) < 0 && a.push({jAScreeningQuestionAnswerID: field.attr('data-value')});
                            } else {
                                let del = a.find( x => x.jAScreeningQuestionAnswerID === field.attr('data-value') );

                                if (del) {
                                    a.splice(a.indexOf(del), 1);
                                }
                            }

                            if (a.length === 0) {
                                delete sender._answers[field.attr('data-qid')];
                            } else {
                                sender._answers[id] = {
                                    jobAppJaSqID: shazamme.uuid(),
                                    jAScreeningQuestionID: field.attr('data-qid'),
                                    listAnswers: a,
                                };
                            }

                            break;
                        }
                    }
                });
            }

            this._restoreAnswers = () => {

                for (let qid in sender._answers) {
                    let ans = sender._answers[qid];

                    qid = qid.split(':')[0];

                    let field = container.find(`input[data-qid=${qid}]`);

                    switch (field.attr('data-qtype')) {
                        case 'text':
                        case 'number':
                        case 'date': {
                            field.val(ans.answer);
                            break;
                        }

                        case 'bool': {
                            field.attr('checked', true);
                            break;
                        }

                        case 'list':
                        case 'check-list':
                        case 'radio': {
                            ans.listAnswers?.forEach( i => {
                                container.find(`input[data-qid=${qid}][value=${i.jAScreeningQuestionAnswerID}]`).attr('checked', true);
                                container.find(`select[data-qid=${qid}]`).val(i.jAScreeningQuestionAnswerID);
                            });

                            break;
                        }
                    }
                }
            }

            this._readFile = (file) => {
                return new Promise( res => {
                    let reader = new FileReader();

                    reader.addEventListener("load",  () => {
                        res(btoa(reader.result));
                    }, false);

                    reader.readAsBinaryString(file);
                });
            }

            this._fileBlob = (b64Data, contentType='', sliceSize=512) => {
                const byteCharacters = atob(b64Data);
                const byteArrays = [];

                for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
                    const slice = byteCharacters.slice(offset, offset + sliceSize);

                    const byteNumbers = new Array(slice.length);
                    for (let i = 0; i < slice.length; i++) {
                      byteNumbers[i] = slice.charCodeAt(i);
                    }

                    const byteArray = new Uint8Array(byteNumbers);
                    byteArrays.push(byteArray);
                }

                const blob = new Blob(byteArrays, {type: contentType});
                return blob;
            }

            w.log(`Loading plugin: screening-question-job-adder (${Version})`);

            shazamme.bag('plugin-screening-question-job-adder', {
                message: Message,
                version: Version,
            });

            return this._fetchQuestions().then( () => {
                this._showQuestions(0, false);

                return Promise.resolve({
                    nextPage: nextPage,
                    prevPage: prevPage,
                    answers: answers,
                    loadAnswers: loadAnswers,
                    knockout: knockout,
                    container: container,
                    validate: validate,
                    message: Message,
                    version: Version,
                });
            });
        }
    }
})();
