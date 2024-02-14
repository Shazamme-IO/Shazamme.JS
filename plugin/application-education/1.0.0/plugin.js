(() => {
    const Version = '1.0.0';

    shazamme
        .style('https://d1x4k0bobyopcw.cloudfront.net/plugin/application-education/1.0.0/plugin.css')
        .then();

    const educationEl = (c) => `
        <div class="section-education" data-rel="education">
            <div class="input-field-container">
                <label class="required">${c?.institution || 'Institution'}</label>
                <input data-rel="field" data-field="institution" data-required />
            </div>

            <div class="input-field-container">
                <label>${c?.major || 'Major'}</label>
                <input data-rel="field" data-field="major" />
            </div>

            <div class="input-field-container input-field-spacer">
                <label>${c?.degree || 'Degree'}</label>
                <input data-rel="field" data-field="degree" />
            </div>

            <div class="input-field-container input-field-spacer">
                <label>${c?.description || 'Description'}</label>
                <textarea rows="5" cols="50" data-rel="field" data-field="description" data-required></textarea>
            </div>

            <div class="input-field-container">
                <label class="required">${c?.startDate || 'Start Date'}</label>
                <input type="date" data-rel="field" data-field="startDate" data-required />
            </div>

            <div class="input-field-container">
                <label class="required">${c?.endDate || 'End Date'}</label>
                <input type="date" data-rel="field" data-field="endDate" data-required />
            </div>

            <div class="radioBtnContainer">
                <label>${c?.current || 'Is Current?'}</label>
                <input type="checkbox" data-rel="field" data-field="current" data-required />
            </div>

            <div class="button-set add">
                <button data-rel="button-action" data-action="cancel">${c?.cancelButton || 'Cancel'}</button>
                <button data-rel="button-action" data-action="save">${c?.saveButton || 'Save'}</button>
            </div>


            <div class="button-set edit">
                <button data-rel="button-action" data-action="delete">${c?.deleteButton || 'Delete'}</button>
                <button data-rel="button-action" data-action="edit">${c?.editButton || 'Edit'}</button>
            </div>
        </div>
    `;

    shazamme.plugin = {
        ...shazamme.plugin,

        education: (w, o) => {
            const config = o?.config || {};
            const container = o?.container || $(`<div data-rel="container-education" class="section-education" />`);
            const editing = o?.editing === true;
            const sender = this;

            const submit = (cid) => {
                let e = [];

                container
                    .find('[data-rel=education]')
                    .each(function (_, i) {
                        let answers = {};

                        $(i)
                        .find('[data-rel=field]')
                        .each(function (_, j) {
                            let el = $(j);

                            if (el.is('[type=checkbox]')) {
                                answers[el.attr('data-field')] = el.is(':checked');
                            } else if (el.val().length > 0) {
                                answers[el.attr('data-field')] = el.val();
                            }
                        });

                        e.push(answers);
                    });

                    return shazamme.submit({
                        action: 'Submit Education',
                        candidateID: candidateID,
                        education: e,
                    });
            }

            const isValid = () => {
                let ok = false;

                const answers = container.find('[data-rel=education]');

                answers.each( (_, el) => {
                    $(el)
                        .find('[data-required]')
                        .each(function(_, i) {
                            let el = $(i);
                            let v = el.val();

                            if (!v || v.length === 0) {
                                ok = false;
                                el.addClass('invalid');
                            } else {
                                el.removeClass('invalid');
                            }
                        });
                });

                if (!ok) {
                    alert(config.warningValid || 'Please the complete the required fields');
               } else if (config.min > 0 && answers.length < config.min) {
                    alert(config.warningMin || 'Not enough education submitted');
                    return false;
                }

               return !ok;
            }

            const addEducationEl = () => {
                const el = $(educationEl(config));

                container.append(el);
                el.find('[data-rel=button-remove]').on('click', function() {
                    el.remove();
                });

                el.find('[data-rel=button-action][data-action=save]').on('click', function() {
                    let isValid = true;

                    el
                        .find('[data-required]')
                        .each(function(_, i) {
                            let el = $(i);
                            let v = el.val();

                            if (!v || v.length === 0) {
                                isValid = false;
                                el.addClass('invalid');
                            } else {
                                el.removeClass('invalid');
                            }
                        });

                    if (!isValid) {
                        alert('Please the complete the required fields');
                    } else {
                        el.addClass('saved');
                    }
                });

                el.find('[data-rel=button-action][data-action=cancel], [data-rel=button-action][data-action=delete]').on('click', function() {
                    el.remove();
                });

                el.find('[data-rel=button-action][data-action=edit]').on('click', function() {
                    el.removeClass('saved');
                });

                return el;
            }

            w.log(`Loading plugin: application-education (${Version})`);

            shazamme.bag('plugin-application-education', {
                version: Version,
            });

            container.append(
                $('<button />', {
                    'data-rel': 'button-add-education',
                    'class': 'button-add button-add-education'
                }).append(
                    $('<span />', {
                        'class': 'text',
                    }).text(config.AddEducationButton || 'Add Education')
                ).on('click', function() {
                    addEducationEl();
                })
            );

            return shazamme.user().then( u => {
                if (u?.candidate?.candidateID) {
                        shazamme.submit({
                            action: "Get Education",
                            candidateID: u.candidate.candidateID,
                        }).then( r => {
                            if (r?.status && r?.response?.items) {
                                r.response.items.forEach( exp => {
                                    let el = addExperienceEl();

                                    for (let i in exp) {
                                        let field = el.find(`[data-field=${i}]`);

                                        if (field.is('[type=checkbox]') && exp[i] === true) {
                                            field.attr('checked', 'true');
                                        } else {
                                            field.val(exp[i]);
                                        }
                                    }
                                });
                            }
                        });
                }

                return Promise.resolve({
                    submit: submit,
                    isValid: isValid,
                    container: container,
                    version: Version,
                });
            });
        }
    }
})();
