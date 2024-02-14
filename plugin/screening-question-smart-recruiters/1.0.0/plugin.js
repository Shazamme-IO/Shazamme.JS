(() => {
    const Version = '1.0.0';

    const Message = {
        submit: 'screening-question-smart-recruiters-apply',
    }

    shazamme
        .style('https://d1x4k0bobyopcw.cloudfront.net/plugin/screening-question-smart-recruiters/1.0.0/plugin.css')
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
                let data = [];

                this._recordAnswers();

                for (let i in this._answers) {
                    data.push(this._answers[i]);
                }

                return data;
            }

            const loadAnswers = () => {
                // TODO
            }

            const knockout = (answers) => {
                let ko = this.answers
                    .map( a =>
                        sender._ko.find( i =>
                            i.screeningQuestionID === a.screeningQuestionID
                                && (
                                    (i.questionType === 'Text' && a.answerText?.toLowerCase() === i.knockOutText?.toLowerCase())
                                    || (i.questionType === 'Number'&& a.answerNum === i.knockOutNumber)
                                    || (i.questionType === 'Date'&& a.answerDate === i.knockOutDate)
                                    || (i.questionType === 'Boolean'&& a.answerBoolean === i.knockOutBoolean)
                                    || (i.questionType === 'List' && a.answerUUID === i.knockOutList)
                                    || (i.questionType === 'Multiselect Checkbox' && (a.answerUUID?.indexOf(i.knockOutList) >= 0 || a.answerBoolean === i.knockOutBoolean))
                                    || (i.questionType === 'Radio' && a.answerUUID === i.knockOutList)
                                )
                        )
                    )
                    .filter( a => a );

                if (ko?.length > 0) {
                    w.config().then( c => {
                        ko.forEach( i => {
                            let handle = c?.knockout?.find( x => x.screeningQuestionID === i.screeningQuestionID );

                            if (handle?.alert?.length > 0) {
                                alert(handle.alert);
                            }

                            if (handle?.redirect?.length > 0) {
                                let link = editing ? `/site/${dudaAlias}${handle.redirect}?preview=true&insitepreview=true&dm_device=desktop` : handle.redirect;

                                window.location = link;
                            }
                        })
                    });

                    return false;
                }
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
                    (
                        (editing && !jid && Promise.resolve(JSON.parse('{"items":[{"sRQuestionsID": "ece81c14-cc13-4c11-8329-00b551164e19","question": "Do you agree for these checks to be conducted?","questionType": "RADIO","jobID": "af0513c3-c16e-4577-b5fc-0f76a1bbfc07","siteID": "854282ae-eebe-491b-a8fc-4ef502d60eb5","sortOrder": 51},{"sRQuestionsID": "150c4af8-14ec-4016-9645-06135c05c579","question": "Do you identify yourself as a person with a disability?","questionType": "SINGLE_SELECT","jobID": "af0513c3-c16e-4577-b5fc-0f76a1bbfc07","siteID": "854282ae-eebe-491b-a8fc-4ef502d60eb5","sortOrder": 60},{"sRQuestionsID": "a5fce0ca-18a2-4ecc-8f35-071fb3da825f","question": "Do you identify as Aboriginal or Torres Strait Islander?","questionType": "RADIO","jobID": "af0513c3-c16e-4577-b5fc-0f76a1bbfc07","siteID": "854282ae-eebe-491b-a8fc-4ef502d60eb5","sortOrder": 70},{"sRQuestionsID": "ec700817-628b-4877-8a48-1b99907e11b5","question": "Languages","questionType": "INPUT_TEXT","jobID": "af0513c3-c16e-4577-b5fc-0f76a1bbfc07","siteID": "854282ae-eebe-491b-a8fc-4ef502d60eb5","sortOrder": 39},{"sRQuestionsID": "ec700817-628b-4877-8a48-1b99907e11b5","question": "Languages","questionType": "SINGLE_SELECT","jobID": "af0513c3-c16e-4577-b5fc-0f76a1bbfc07","siteID": "854282ae-eebe-491b-a8fc-4ef502d60eb5","sortOrder": 39},{"sRQuestionsID": "6281ddaa-b86f-4567-a91f-2eb6b1feda1b","question": "Do you hold a current Drivers Licence in the country in which this role is located?","questionType": "RADIO","jobID": "af0513c3-c16e-4577-b5fc-0f76a1bbfc07","siteID": "854282ae-eebe-491b-a8fc-4ef502d60eb5","sortOrder": 10},{"sRQuestionsID": "68a478fb-7a7c-4c98-bb0f-407b86187a12","question": "I hereby certify that the above is true and correct and will be held by Global Express in the strictest confidence in accordance with the Privacy Act.\\n\\nI accept that if any of the information given by me in this application is in any way false or incorrect, any offer of employment may be withdrawn or my employment with Global Express may be terminated summarily or I may be dismissed.\\n\\nBy continuing, you agree that you have read our Privacy Policy, and consent to Global Express collecting, using and disclosing your personal information as set our in that policy.\\n\\nFor the avoidance of doubt, you consent to the collection, use, process and/or disclosure of your personal data by Global Express for the purposes of assessing and evaluating your suitability for employment in any current or prospective position within the organisation and verifying your identity and the accuracy of your personal details and other information provided in this questionnaire.","questionType": "CHECKBOX","jobID": "af0513c3-c16e-4577-b5fc-0f76a1bbfc07","siteID": "854282ae-eebe-491b-a8fc-4ef502d60eb5","sortOrder": 55},{"sRQuestionsID": "7c70a592-75b2-4b95-831f-43e90363d930","question": "Gender","questionType": "SINGLE_SELECT","jobID": "af0513c3-c16e-4577-b5fc-0f76a1bbfc07","siteID": "854282ae-eebe-491b-a8fc-4ef502d60eb5","sortOrder": 74},{"sRQuestionsID": "4ea81f20-901c-4cf1-8c03-66b2d2c3a4a1","question": "What is your notice period?","questionType": "SINGLE_SELECT","jobID": "af0513c3-c16e-4577-b5fc-0f76a1bbfc07","siteID": "854282ae-eebe-491b-a8fc-4ef502d60eb5","sortOrder": 33},{"sRQuestionsID": "bd2c4f99-b4f2-494d-ad82-7a60a9af0ddb","question": "What is your expected annual base salary?","questionType": "SINGLE_SELECT","jobID": "af0513c3-c16e-4577-b5fc-0f76a1bbfc07","siteID": "854282ae-eebe-491b-a8fc-4ef502d60eb5","sortOrder": 22},{"sRQuestionsID": "76421ccd-d76c-4340-a507-7bd0badb7fc7","question": "Have you worked for Global Express before?","questionType": "RADIO","jobID": "af0513c3-c16e-4577-b5fc-0f76a1bbfc07","siteID": "854282ae-eebe-491b-a8fc-4ef502d60eb5","sortOrder": 14},{"sRQuestionsID": "770c4f57-af8d-4f98-8674-7c4fc4ffb3e2","question": "Do you require any adjustments to be made in order to participate in the recruitment process, or to perform the necessary requirements of the role?","questionType": "SINGLE_SELECT","jobID": "af0513c3-c16e-4577-b5fc-0f76a1bbfc07","siteID": "854282ae-eebe-491b-a8fc-4ef502d60eb5","sortOrder": 65},{"sRQuestionsID": "e7878629-26cc-489a-a471-828c37f17b51","question": "Are you currently employed at Global Express either Permanently or via a third party supplier (Contractor, Consultant)?","questionType": "RADIO","jobID": "af0513c3-c16e-4577-b5fc-0f76a1bbfc07","siteID": "854282ae-eebe-491b-a8fc-4ef502d60eb5","sortOrder": 18},{"sRQuestionsID": "9eee4a24-2713-4bb4-8e39-9eb086c49315","question": "Please attach relevant documents to support your application such as working rights visa and identification","questionType": "INFORMATION","jobID": "af0513c3-c16e-4577-b5fc-0f76a1bbfc07","siteID": "854282ae-eebe-491b-a8fc-4ef502d60eb5","sortOrder": 8},{"sRQuestionsID": "0769000e-d49c-4305-a54d-c5d98cf6732d","question": "At Global Express Safety is at the forefront of everything we do. The provision of background checks (including police probity checks) and a medical assessment is a minimum standard requirment for obtaining or continuing direct employment or engagement with Global Express.","questionType": "INFORMATION","jobID": "af0513c3-c16e-4577-b5fc-0f76a1bbfc07","siteID": "854282ae-eebe-491b-a8fc-4ef502d60eb5","sortOrder": 49},{"sRQuestionsID": "c9c1a48f-8199-4eb6-b438-e84697a7dcaf","question": "DIVERSITY AND INCLUSION\\nIdentification in any of these groups is optional and will be shared with the recruitment team or hiring manager where appropriate.\\n\\nThe information is used for the purposes of supporting increased accessibility of employment opportunities for candidates with a disability and for internal statistical reporting on diversity.\\n\\nThis reporting will not identify you or any other individual.","questionType": "INFORMATION","jobID": "af0513c3-c16e-4577-b5fc-0f76a1bbfc07","siteID": "854282ae-eebe-491b-a8fc-4ef502d60eb5","sortOrder": 58},{"sRQuestionsID": "65f8fcb7-9348-422f-9cad-f33c2b3d4793","question": "Are you currently authorised to work in the country in which this role is located?","questionType": "SINGLE_SELECT","jobID": "af0513c3-c16e-4577-b5fc-0f76a1bbfc07","siteID": "854282ae-eebe-491b-a8fc-4ef502d60eb5","sortOrder": 2}],"message": null,"validations":[],"status": 200}')))
                        || shazamme.submit({
                            action: "Get Screening Questions - SR",
                            jobID: jid,
                        })
                    )
                    .then( res => {
                        if (!res || !res.items || res.items.length == 0) {
                            resolve();
                            return;
                        }

                        if (!sender._pages[0]) sender._pages[0] = [];
                        sender._pages[0] = sender._pages[0].concat(res.items);
                        sender._ko = res.items.filter( q => q.knockOutDate || q.knockOutList || q.knockOutText || q.knockOutNumber || (q.knockOutBoolean !== null) );

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
                        options: q.options?.filter( o => !q.parentQuestionID || sender._answers[q.parentQuestionID].answerUUID?.indexOf(o.parentOptionID) >= 0) || [],
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
                switch (q.questionType) {
                    case 'INPUT_TEXT':
                        return `
                             <div class="input-field-container">
                                <label>
                                <p class="sq-list-question">
                                    ${q.question}
                                    ${q.isMandatory ? '*' : ''}
                                    <input class="sq-input-text-style" type="text" maxlength=${q.length || -1} autocomplete="nope" data-qtype="text" data-qid="${q.sRQuestionsID}" ${q.isMandatory ? 'required' : ''} />
                                </p>
                                </label>
                                <div class="sq-help-text" ${q.isHelpTextCollapse ? 'collapsible' : ''}>
                                    <p class="text-main">${q.helpText || ''}</p>
                                    <div class="section-read-more" style="text-align: ${config.readMoreAlign}">
                                        <a href="javascript: void(0);" class="button-show-more" data-rel="button-show-more">${config.showMoreHelpText}</a>
                                    </div>
                                </div>
                            </div>
                        `;

                    case 'TEXTAREA':
                        return `
                             <div class="input-field-container">
                                <label>
                                <p class="sq-list-question">
                                    ${q.question}
                                    ${q.isMandatory ? '*' : ''}
                                    <textarea class="sq-input-text-style" type="text" maxlength=${q.length || -1} autocomplete="nope" data-qtype="text" data-qid="${q.sRQuestionsID}" ${q.isMandatory ? 'required' : ''} ></textarea>
                                </p>
                                </label>
                                <div class="sq-help-text" ${q.isHelpTextCollapse ? 'collapsible' : ''}>
                                    <p class="text-main">${q.helpText || ''}</p>
                                    <div class="section-read-more" style="text-align: ${config.readMoreAlign}">
                                        <a href="javascript: void(0);" class="button-show-more" data-rel="button-show-more">${config.showMoreHelpText}</a>
                                    </div>
                                </div>
                            </div>
                        `;

                    case 'NUMBER':
                        return `
                             <div class="input-field-container">
                                <label>
                                <p class="sq-list-question">
                                    ${q.question}
                                    ${q.isMandatory ? '*' : ''}
                                </p>
                                    <input type="number" autocomplete="nope" data-qtype="number" data-qid="${q.sRQuestionsID}" ${q.isMandatory ? 'required' : ''} />
                                </label>
                                <div class="sq-help-text" ${q.isHelpTextCollapse ? 'collapsible' : ''}>
                                    <p class="text-main">${q.helpText || ''}</p>
                                    <div class="section-read-more" style="text-align: ${config.readMoreAlign}">
                                        <a href="javascript: void(0);" class="button-show-more" data-rel="button-show-more">${config.showMoreHelpText}</a>
                                    </div>
                                </div>
                            </div>
                        `;

                    case 'DATE':
                        return `
                             <div class="input-field-container">
                                <label>
                                <p class="sq-list-question">
                                    ${q.question}
                                    ${q.isMandatory ? '*' : ''}
                                 </p>
                                    <input type="date" autocomplete="nope" data-qtype="date" data-qid="${q.sRQuestionsID}" ${q.isMandatory ? 'required' : ''} />

                                </label>
                                <div class="sq-help-text" ${q.isHelpTextCollapse ? 'collapsible' : ''}>
                                    <p class="text-main">${q.helpText || ''}</p>
                                    <div class="section-read-more" style="text-align: ${config.readMoreAlign}">
                                        <a href="javascript: void(0);" class="button-show-more" data-rel="button-show-more">${config.showMoreHelpText}</a>
                                    </div>
                                </div>
                            </div>
                        `;

                    case 'CHECKBOX':
                        return `
                             <div class="input-field-container">
                                <label>
                                <p class="sq-list-question">
                                    ${q.question}
                                    ${q.isMandatory ? '*' : ''}
                                </p>
                                    <input type="checkbox" autocomplete="nope" data-qtype="bool" data-qid="${q.sRQuestionsID}" ${q.isMandatory ? 'required' : ''}  />

                                </label>
                                <div class="sq-help-text" ${q.isHelpTextCollapse ? 'collapsible' : ''}>
                                    <p class="text-main">${q.helpText || ''}</p>
                                    <div class="section-read-more" style="text-align: ${config.readMoreAlign}">
                                        <a href="javascript: void(0);" class="button-show-more" data-rel="button-show-more">${config.showMoreHelpText}</a>
                                    </div>
                                </div>
                            </div>
                        `;

                    case 'SINGLE_SELECT': {
                        let opts = q.options.map( o => `<option value="${o.value}">${o.label || o.option}</option>`);

                        return `
                             <div class="input-field-container">
                                <p class="sq-list-question">${q.question}</p>
                                <select data-qtype="list" data-qid="${q.sRQuestionsID}" ${q.isMandatory ? 'required' : ''}>${opts.join('')}</select>
                                <div class="sq-help-text" ${q.isHelpTextCollapse ? 'collapsible' : ''}>
                                    <p class="text-main">${q.helpText || ''}</p>
                                    <div class="section-read-more" style="text-align: ${config.readMoreAlign}">
                                        <a href="javascript: void(0);" class="button-show-more" data-rel="button-show-more">${config.showMoreHelpText}</a>
                                    </div>
                                </div>
                             </div>
                        `;
                    }

                    case 'MULTI_SELECT': {
                        let opts = q.options.map( o => `<label><input type="checkbox" autocomplete="nope" data-qtype="check-list" data-qid="${q.sRQuestionsID}" data-value="${o.value}" />${o.label || o.option}</label>`);

                        return `
                             <div class="input-field-container">
                                <p class="sq-checklist-question">
                                    ${q.question}
                                    ${q.isMandatory ? '*' : ''}
                                </p>
                                <div class="sq-help-text" ${q.isHelpTextCollapse ? 'collapsible' : ''}>
                                    <p class="text-main">${q.helpText || ''}</p>
                                    <div class="section-read-more" style="text-align: ${config.readMoreAlign}">
                                        <a href="javascript: void(0);" class="button-show-more" data-rel="button-show-more">${config.showMoreHelpText}</a>
                                    </div>
                                </div>
                                ${opts.join('')}
                             </div>
                        `;
                    }

                    case 'RADIO': {
                        let opts = q.options.map( o => `<label class="sq-question-option"><input type="radio" data-qtype="radio" name="${q.sRQuestionsID}" data-qid="${q.sRQuestionsID}" value="${o.value}" ${q.isMandatory ? 'required' : ''} />${o.label || o.option}</label>`);

                        return `
                             <div class="input-field-container">
                                <p class="sq-radio-question">
                                    ${q.question}
                                    ${q.isMandatory ? '*' : ''}
                                </p>
                                <div class="sq-help-text" ${q.isHelpTextCollapse ? 'collapsible' : ''}>
                                    <p class="text-main">${q.helpText || ''}</p>
                                    <div class="section-read-more" style="text-align: ${config.readMoreAlign}">
                                        <a href="javascript: void(0);" class="button-show-more" data-rel="button-show-more">${config.showMoreHelpText}</a>
                                    </div>
                                </div>
                                <div class="sq-opt-list">${opts.join('')}</div>
                             </div>
                        `;
                    }

                    case 'INFORMATION': {
                        return `
                             <div class="input-field-container">
                                <p class="sq-radio-question">
                                    ${q.question}
                                </p>
                                <div class="sq-help-text" ${q.isHelpTextCollapse ? 'collapsible' : ''}>
                                    <p class="text-main">${q.helpText || ''}</p>
                                    <div class="section-read-more" style="text-align: ${config.readMoreAlign}">
                                        <a href="javascript: void(0);" class="button-show-more" data-rel="button-show-more">${config.showMoreHelpText}</a>
                                    </div>
                                </div>
                             </div>
                        `;
                    }

                    case 'FILE':
                        return `
                             <div class="input-field-container">
                                <label>
                                <p class="sq-list-question">
                                    ${q.question}
                                    ${q.isMandatory ? '*' : ''}
                                </p>
                                    <input type="file" autocomplete="nope" data-qtype="file" data-qid="${q.sRQuestionsID}" ${q.isMandatory ? 'required' : ''} />
                                </label>
                                <div class="sq-help-text" ${q.isHelpTextCollapse ? 'collapsible' : ''}>
                                    <p class="text-main">${q.helpText || ''}</p>
                                    <div class="section-read-more" style="text-align: ${config.readMoreAlign}">
                                        <a href="javascript: void(0);" class="button-show-more" data-rel="button-show-more">${config.showMoreHelpText}</a>
                                    </div>
                                </div>
                            </div>
                        `;

                    case 'HEADER':
                        return `<div class='screening-question-heading'><h3>${q.question}</h3</div>`;

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
                                sRQuestionID: field.attr('data-qid'),
                                key: 'Value',
                                value: field.val(),
                                candidateID: candidateID,
                            };
                            break;
                        }

                        case 'number': {
                            sender._answers[field.attr('data-qid')] = {
                                sRQuestionID: field.attr('data-qid'),
                                key: 'Value',
                                value: parseInt(field.val()),
                                candidateID: candidateID,
                            };
                            break;
                        }

                        case 'date': {
                            sender._answers[field.attr('data-qid')] = {
                                sRQuestionID: field.attr('data-qid'),
                                key: 'Value',
                                value: field.val(),
                                candidateID: candidateID,
                            };
                            break;
                        }

                        case 'bool': {
                            sender._answers[field.attr('data-qid')] = {
                                sRQuestionID: field.attr('data-qid'),
                                key: 'Value',
                                value: field.is(":checked"),
                                candidateID: candidateID,
                            };
                            break;
                        }

                        case 'list': {
                            sender._answers[field.attr('data-qid')] = {
                                sRQuestionID: field.attr('data-qid'),
                                key: 'Value',
                                value: field.val(),
                                candidateID: candidateID,
                            };
                            break;
                        }

                        case 'check-list': {
                            sender._answers[`${field.attr('data-qid')}:${field.attr('data-value')}`] = {
                                sRQuestionID: field.attr('data-qid'),
                                key: 'Value',
                                value: field.attr('data-value'),
                                candidateID: candidateID,
                            };
                            break;
                        }

                        case 'radio': {
                            if (field.is(":checked")) {
                                sender._answers[field.attr('data-qid')] = {
                                    sRQuestionID: field.attr('data-qid'),
                                    key: 'Value',
                                    value: field.attr('value'),
                                    candidateID: candidateID,
                                };
                            }
                            break;
                        }

                        case 'file': {
                            let file = field.get(0).files.length > 0 && field.get(0).files[0];

                            if (file) {
                                sender._readFile(file).then( val => {
                                    sender._answers[field.attr('data-qid')] = {
                                        sRQuestionID: field.attr('data-qid'),
                                        key: 'Value',
                                        value: val,
                                        candidateID: candidateID,
                                        answerFileName: file.name,
                                    };
                                });
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
                            field.val(ans.value);
                            break;
                        }

                        case 'bool': {
                            field.attr('checked', true);
                            break;
                        }

                        case 'list':
                        case 'check-list':
                        case 'radio': {
                            container.find(`input[data-qid=${qid}][value=${ans.value}]`).attr('checked', true);
                            container.find(`select[data-qid=${qid}]`).val(ans.value);
                            break;
                        }

                        case 'file': {
                            field.val(this._fileBlob(ans.value));
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

            this._showEditor = () => {
                const dialog = $(`
                    <div class="dialog dialog-knockout editor-only" data-rel="dialog" data-dialog="knockout">
                        <div class="content" data-rel="dialog-content"></div>

                        <div class="buttons">
                            <button class="submit" data-rel="button-submit"><span class="text">OK</span></button>
                            <button class="dismiss" data-rel="button-dismiss"><span class="text">Cancel</span></button>
                        </div>
                    </div>
                `)
                .appendTo(container);

                const option = (q) => {
                    if (q.knockOutDate) {
                        return new Date(q.knockOutDate).toLocaleDateString();
                    }

                    if (q.knockOutList) {
                        return q.options?.find(i => i.screeningQuestionOptionsID === q.knockOutList)?.option;
                    }

                    if (q.knockOutText) {
                        return q.knockOutText;
                    }

                    if (q.knockOutNumber) {
                        return q.knockOutNumber;
                    }

                    if (q.knockOutBoolean !== null) {
                        return q.knockOutBoolean ? 'Yes' : 'No';
                    }

                    return '';
                }

                const el = (q) => `
                    <article data-rel="knockout" data-id="${q.screeningQuestionID}">
                        <div class="row">
                            <label>${q.question}</label>
                            <label>${option(q)}</label>
                        </div>

                        <div class="row">
                            <label>
                                Message
                                <input type="text" data-rel="alert" placeholder="Sorry, we can accept you at this time." value="${q.alert || ''}" />
                            </label>

                            <label>
                                Redirect (Leave blank for no redirect)
                                <input type="text" data-rel="redirect" placeholder="/reject" value="${q.redirect || ''}" />
                            </label>
                        </div>

                        <div class="row">
                            <label>
                                Enable
                                <input type="checkbox" data-rel="enable" ${q.alert?.length > 0 || q.redirect?.length > 0 ? 'checked="checked"' : ''} />
                            </label>
                        </div>
                    </article>
                `;

                if (sender._ko.length === 0) {
                    return;
                }

                w.config().then( c => {
                    dialog.find('[data-rel=dialog-content]')
                        .empty()
                        .append(sender._ko.map( q => el({
                            ...q,
                            ...c?.knockout?.find( i => i.screeningQuestionID === q.screeningQuestionID ),
                        }) ));

                    container.find('.button-editor').remove();

                    $('<button />')
                        .text('Edit Knockout Handling')
                        .addClass('button-editor')
                        .on('click', function() {
                            dialog.toggle();
                        })
                        .prependTo(container);

                    const toggleEnable = (e) => {
                        let toggle = $(e.target);

                        $('<input />')
                            .attr({
                                'type': 'checkbox',
                                'data-rel': 'enable',
                                'checked': toggle.is(':checked') ? 'checked' : null,
                            })
                            .on('click', toggleEnable)
                            .appendTo(toggle.parent());

                        toggle.remove();
                    }

                    dialog.find('[data-rel=enable]').on('click', toggleEnable);

                    dialog.find('[data-rel=button-submit]').on('click', function() {
                        let knockout = [];

                        dialog.find('[data-rel=dialog-content] article [data-rel=enable]:checked').each( (_, i) => {
                            let el = $(i).parents('article');

                            knockout.push({
                                screeningQuestionID: el.attr('data-id'),
                                alert: el.find('[data-rel=alert]').val(),
                                redirect: el.find('[data-rel=redirect]').val(),
                            });
                        });

                        w.config()
                            .then( c =>
                                w.config({
                                    ...c,
                                    knockout: knockout,
                                })
                            )
                            .then( () => {
                                c.knockout = knockout;
                            });

                        dialog.toggle();
                    });

                    dialog.find('[data-rel=button-dismiss]').on('click', function() {
                        dialog.toggle();

                        dialog.find('[data-rel=dialog-content]')
                            .empty()
                            .append(sender._ko.map( q => el({
                                ...q,
                                ...c?.knockout?.find( i => i.screeningQuestionID === q.screeningQuestionID ),
                            }) ));

                        dialog.find('[data-rel=enable]').on('click', toggleEnable);
                    });
                });
            }

            w.log(`Loading plugin: screening-question-smart-recruiters (${Version})`);

            shazamme.bag('plugin-screening-question-smart-recruiters', {
                message: Message,
                version: Version,
            });

            return this._fetchQuestions().then( () => {
                this._showQuestions(0, false);

                if (editing) {
                    this._showEditor();
                }

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
