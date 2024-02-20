(() => {
    const Version = '1.0.0';

    shazamme
        .style('https://d1x4k0bobyopcw.cloudfront.net/plugin/application-experience/1.0.0/plugin.css')
        .then();

    const experienceEl = (c) => {
        return `
            <div class="section-experience" data-rel="experience">
                <div class="input-field-container">
                    <label class="required">${c?.title || 'Title'}</label>
                    <input data-rel="field" data-field="title" data-required />
                </div>

                <div class="input-field-container">
                    <label>${c?.company || 'Company'}</label>
                    <input data-rel="field" data-field="company" />
                </div>

                <div class="input-field-container input-field-spacer">
                    <label>${c?.location || 'Location'}</label>
                    <input data-rel="field" data-field="location" />
                </div>

                <div class="input-field-container input-field-spacer">
                    <label class="required">${c?.description || 'Description'}</label>
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
                    <label>${c?.current || 'Current Position?'}</label>
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
    }

    shazamme.plugin = {
        ...shazamme.plugin,

        experience: (w, o) => {
            const config = o?.config || {};
            const container = o?.container || $(`<div data-rel="container-experience" class="section-experience" />`);
            const editing = o?.editing === true;
            const site = shazamme.bag('site-config');
            const sender = this;

            const submit = (cid) => {
                let e = [];

                container
                    .find('[data-rel=experience]')
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
                        action: 'Submit Experience',
                        candidateID: cid,
                        experience: e,
                    });
            }

            const isValid = () => {
                let ok = false;

                const answers = container.find('[data-rel=experience]');

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
                    let warning = config?.warningValid || 'Please complete the required fields';

                    site?.alertDialog({
                        title: config?.warningValidTitle || 'Please Complete Experience',
                        message: warning,
                    })?.appendTo(container) || alert(warning);

                    return false;
               } else if (config?.requireExperience > 0 && answers.length < config?.requireExperience) {
                    let warning = config?.warningMin || 'Not enough experience submitted';

                    site?.alertDialog({
                        title: config?.warningMinTitle || 'Need Additional Experience',
                        message: warning,
                    })?.appendTo(container) || alert(warning);

                    return false;
                }

               return !ok;
            }

            const addExperienceEl = () => {
                let el = $(experienceEl(config));

                container.append(el);

                el.find('[data-rel=field][data-field=current]').on('change', function() {
                    el.find('[data-rel=field][data-field=endDate]').attr('data-required', $(this).is(':checked') ? null : '')
                });

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
                        let warning = config?.warningValid || 'Please complete the required fields';

                        site?.alertDialog({
                            title: config?.warningValidTitle || 'Please Complete Experience',
                            message: warning,
                        })?.appendTo(container) || alert(warning);
                   } else {
                        el
                            .addClass('saved')
                            .find('input, textarea')
                            .attr('readonly', 'readonly');
                    }
                });

                el.find('[data-rel=button-action][data-action=cancel], [data-rel=button-action][data-action=delete]').on('click', function() {
                    el.remove();
                });

                el.find('[data-rel=button-action][data-action=edit]').on('click', function() {
                    el
                        .removeClass('saved')
                        .find('input, textarea')
                        .removeAttr('readonly');
                });

                return el;
            }

            w.log(`Loading plugin: application-experiene (${Version})`);

            shazamme.bag('plugin-application-experiene', {
                version: Version,
            });

            container.append(
                $('<button />', {
                    'data-rel': 'button-add-experience',
                    'class': 'button-add button-add-experience'
                }).append(
                    $('<span />', {
                        'class': 'text',
                    }).text(config.addButton || 'Add Experience')
                ).on('click', function() {
                    addExperienceEl();
                })
            );

            return shazamme.user().then( u => {
                if (u?.candidate?.candidateID) {
                        shazamme.submit({
                            action: "Get Experience",
                            candidateID: u.candidate.candidateID,
                        }).then( r => {
                            if (r?.status && r?.response?.items) {
                                r.response.items.forEach( exp => {
                                    let el = addExperienceEl(config);

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
