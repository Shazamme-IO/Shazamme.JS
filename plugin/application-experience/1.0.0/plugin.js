(() => {
    const Version = '1.0.0';

    shazamme
        .style('https://sdk.shazamme.io/js/plugin/application-experience/1.0.0/plugin.min.css')
        .then();

    const experienceEl = (c) => {
        return `
            <div class="section-experience" data-rel="experience">
                <div class="field">
                    <label class="text required">${c?.title || 'Title'}</label>
                    <input type="text" data-rel="field" data-field="title" data-required />
                </div>

                <div class="field">
                    <label class="text">${c?.company || 'Company'}</label>
                    <input type="text" data-rel="field" data-field="company" />
                </div>

                <div class="field">
                    <label class="text">${c?.location || 'Location'}</label>
                    <input type="text" data-rel="field" data-field="location" />
                </div>

                <div class="field row">
                    <label class="text required">${c?.description || 'Description'}</label>
                    <textarea rows="5" cols="50" data-rel="field" data-field="description" data-required></textarea>
                </div>

                <div class="field">
                    <label class="text required">${c?.startDate || 'Start Date'}</label>
                    <input type="date" data-rel="field" data-field="startDate" data-required />
                </div>

                <div class="field">
                    <label class="text required">${c?.endDate || 'End Date'}</label>
                    <input type="date" data-rel="field" data-field="endDate" data-required />
                </div>

                <div class="field inline row">
                    <input type="checkbox" data-rel="field" data-field="current" data-required />
                    <label class="text">${c?.current || 'Current Position?'}</label>
                </div>

                <div class="field button action">
                    <button data-rel="button-action" data-action="save"><span class="text">${c?.saveButton || 'Save'}</span></button>
                </div>

                <div class="field button action">
                    <button data-rel="button-action" data-action="cancel"><span class="text">${c?.cancelButton || 'Cancel'}</span></button>
                </div>

                <div class="field button action saved">
                    <button data-rel="button-action" data-action="edit"><span class="text">${c?.editButton || 'Edit'}</span></button>
                </div>

                <div class="field button action saved">
                    <button data-rel="button-action" data-action="delete"><span class="text">${c?.deleteButton || 'Delete'}</span></button>
                </div>
            </div>
        `;
    }

    shazamme.plugin = {
        ...shazamme.plugin,

        experience: (w, o) => {
            const config = o?.config || {};
            const container = o?.container || $(`<div data-rel="container-experience" class="container-experience" />`);
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
                let ok = true;

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
               } else if (config?.min > 0 && answers.length < config?.min) {
                    let warning = config?.warningMin || 'Not enough experience submitted';

                    site?.alertDialog({
                        title: config?.warningMinTitle || 'Need Additional Experience',
                        message: warning,
                    })?.appendTo(container) || alert(warning);

                    return false;
                }

               return ok;
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

            container.append($(`
                <div class="field button">
                    <button "data-rel"="button-add-experience" "class"="button-add button-add-experience">
                        <span class="text">${config?.addButton || 'Add Experience'}</span>
                    </button>
                </div>
            `).on('click', 'button', function() {
                addExperienceEl();
            }));

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
                                        } else if (field.is('[type=date]')) {
                                            let d = new Date(exp[i]);

                                            if (d) {
                                                field.val(d.toJSON().substr(0, 10));
                                            }
                                        } else {
                                            field.val(exp[i]);
                                        }
                                    }

                                    el
                                        .addClass('saved')
                                        .find('input, textarea')
                                        .attr('readonly', 'readonly');

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
