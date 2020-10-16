$(function () {

    let Preview = {
        delay: 500,        // delay after keystroke before updating

        preview: null,     // filled in by Init below
        buffer: null,      // filled in by Init below

        timeout: null,     // store setTimout id
        mjRunning: false,  // true when MathJax is processing
        mjPending: false,  // true when a typeset has been queued

        Init: function () {
            this.preview = $("#output-preview")[0];
            this.buffer = $("#output-buffer")[0];
        },

        SwapBuffers: function () {
            let buffer = this.preview;
            let preview = this.buffer;
            this.buffer = buffer;
            this.preview = preview;
            buffer.style.visibility = "hidden";
            buffer.style.position = "absolute";
            preview.style.position = "";
            preview.style.visibility = "";
        },

        Update: function () {
            if (this.timeout) {
                clearTimeout(this.timeout);
            }
            this.timeout = setTimeout(this.callback, this.delay);
        },

        CreatePreview: function () {
            Preview.timeout = null;
            if (this.mjPending) {
                return;
            }
            let text = this.PatchText($("#msg")[0].value);
            if (text === this.oldtext) {
                return;
            }
            if (this.mjRunning) {
                this.mjPending = true;
                MathJax.Hub.Queue(["CreatePreview", this]);
            } else {
                this.buffer.innerHTML = this.oldtext = text;
                this.mjRunning = true;
                MathJax.Hub.Queue(
                    ["Typeset", MathJax.Hub, this.buffer],
                    ["PatchCSS", this],
                    ["PreviewDone", this]
                );
            }
        },

        PreviewDone: function () {
            this.mjRunning = this.mjPending = false;
            this.SwapBuffers();
        },

        PatchCSS: function () {
            $('span.mtext').css("font-family", "");
            $('span.mtext > span').css("font-family", "");
            // Neo-Euler patch for 'sin, cos, log, exp, mod, ...'
            if (localStorage.getItem('webFont') == 'Neo-Euler') {
                let ratio = 0.9;
                $('span.mo').each(function () {
                    if ($(this).text().length > 1) {
                        $(this).css("font-family", "MathJax_Main");
                        let oldpx = $(this).css("font-size");
                        let newpx = (oldpx.match(/([.0-9]+)px/)[1] * ratio) + 'px'
                        $(this).css("font-size", newpx);
                    }
                });
                $('span.mi').each(function () {
                    if ($(this).text().length > 1) {
                        $(this).css("font-family", "MathJax_Main");
                        let oldpx = $(this).css("font-size");
                        let newpx = (oldpx.match(/([.0-9]+)px/)[1] * ratio) + 'px'
                        $(this).css("font-size", newpx);
                    }
                });
            }
        },

        PatchText: function (text) {
            text = text.replace(/\$\$\n/g, '$$$$');
            text = text.replace(/^[-*#].+\n/mg, function (s) {
                let a;
                if (a = s.match(/^-(\[|\])\n/)) {
                    return a[1] == '[' ? "<ul>" : '</ul>';
                } else if (a = s.match(/^- (.+?)\n/)) {
                    return "<li>" + a[1] + "</li>";
                } else if (a = s.match(/^[*#](.*)/)) {
                    return "<b>" + a[1] + "</b>\n";
                } else {
                    return s;
                }
            });
            text = text.replace(/(:[a-z_0-9-]+:)/g, function (s) {
                let emoji = Emoji[s];
                if (emoji) {
                    return emoji;
                }
                let a = s.match(/:fa-(.*):/);
                if (a) {
                    return '<i class="fa fa-' + a[1] + ' aria-hidden="true"></i>';
                }
                return s;
            });
            return text;
        }
    };

    let Draft = {
        interval: 1000,
        sheet: null, // '1',...,'7'
        saved_text: null,
        preview_on: null, // 'on' / 'off'
        last_modified: null,

        SaveText: function () {
            let text = $('#msg').val();

            if (Draft.last_modified < localStorage.getItem('last_modified')) {
                alert('Conflict Found.' + "\n" + 'Are you editing in other tab of the same browser?');
                Draft.last_modified = localStorage.getItem('last_modified');
            } else if (Draft.saved_text != text) {
                localStorage.setItem('saved_text_' + Draft.sheet, text);
                Draft.saved_text = text;
                Draft.last_modified = Date.now();
                localStorage.setItem('last_modified', Draft.last_modified);
            }
        },

        RestoreText: function () {
            let text = localStorage.getItem('saved_text_' + Draft.sheet);
            if (text) {
                $('#msg').val(text);
            }
            $('#msg').show();
            $('#msg').focus();
            Draft.last_modified = localStorage.getItem('last_modified');
        },

        UpdateLayout: function () {
            if (Draft.preview_on == 'on') {
                $('#input-col').removeClass('col-md-offset-2');
                $('#input-col').removeClass('col-lg-offset-3');
                $('#output-col').show();
            } else {
                $('#input-col').addClass('col-md-offset-2');
                $('#input-col').addClass('col-lg-offset-3');
                $('#output-col').hide();
            }
        },

        UpdatePreview: function () {
            if (Draft.preview_on == 'on') {
                Preview.Update();
            }
        },

        TogglePreview: function () {
            if (Draft.preview_on == 'on') {
                Draft.preview_on = 'off';
            } else {
                Draft.preview_on = 'on';
                Preview.Update();
            }
            Draft.UpdateLayout();
            localStorage.setItem('preview_on', Draft.preview_on);
            $('#msg').focus();
        },

        ChangeFont: function () {
            let webFonts = ["Neo-Euler", "Asana-Math", "STIX-Web", "TeX"];
            let fontname = localStorage.getItem('webFont');
            let index = webFonts.indexOf(fontname);
            let nextFontname = webFonts[(index + 1) % webFonts.length];
            localStorage.setItem('webFont', nextFontname);
            location.reload(true);
            $('#msg').focus();
        },

        UpdateFontTitle: function () {
            let fontname = localStorage.getItem('webFont');
            if (!fontname) {
                fontname = "TeX";
            }
            $('#CHANGE-FONT').attr('title', "Change Math Font");
            $('#CHANGE-FONT').html(`<i class="fa fa-font" aria-hidden="true"></i> : ${fontname}`);
        },

        UpdateSelectSheetButton: function () {
            $('.SELECT-SHEET').each(function () {
                let sheet = $(this).attr('data-sheet');
                let text = localStorage.getItem('saved_text_' + sheet);
                if (sheet == Draft.sheet) {
                    $(this).addClass('current-sheet');
                } else {
                    $(this).removeClass('current-sheet');
                }
                if (!text || text.length == 0) {
                    $(this).addClass('empty-sheet');
                } else {
                    $(this).removeClass('empty-sheet');
                }
            });
            autosize.update($('#msg'));
        },

        Init: function () {
            Draft.sheet = localStorage.getItem('sheet');
            if (!Draft.sheet) {
                Draft.sheet = '1';
                localStorage.setItem('sheet', Draft.sheet);
            }
            Draft.RestoreText();
            setInterval(Draft.SaveText, Draft.interval);
            $('.SELECT-SHEET').on('click', function (e) {
                let sheet = $(this).attr('data-sheet');
                Draft.SaveText();
                Draft.sheet = sheet;
                localStorage.setItem('sheet', Draft.sheet);
                $('#msg').val('');
                Draft.RestoreText();
                Draft.UpdatePreview();
                Draft.UpdateSelectSheetButton();
            });
            $('#CHANGE-FONT').on('click', function (e) {
                Draft.ChangeFont();
            });
            $('#TOGGLE-PREVIEW').on('click', function (e) {
                Draft.TogglePreview();
            });
            if (localStorage.getItem('preview_on') == 'off') {
                Draft.preview_on = 'off';
            } else {
                Draft.preview_on = 'on';
            }
            Draft.UpdateLayout();
            $('#input-output-row').show();
            $('#msg').keyup(function (e) {
                Draft.UpdatePreview();
            });
            Draft.UpdateFontTitle();
            Draft.UpdateSelectSheetButton();
            Draft.UpdatePreview();
        }
    };

    Preview.callback = MathJax.Callback(["CreatePreview", Preview]);
    Preview.callback.autoReset = true;
    Preview.Init();

    Draft.Init();
    Preview.Update();

    $('#insertLatexCommand').click(() => {
        $('#addMathPartsModal .modal-body').empty();
        $('#addMathPartsModal .modal-body').append(
            `<table class="table table-hover">
            <thead><tr><th scope="col">Template</th><th scope="col">Command</th></tr></thead>
            <tbody id="commandTbody"></tbody></table>`);
        for (const key of Object.keys(LatexCommand)) {
            $('#commandTbody').append(
                `<tr id="${key}" data-toggle="tooltip"><td>${key}</td><td>${LatexCommand[key]}</td></tr>`
            );
            $(`#${key}`).off('click').click(() => {
                let textarea = document.querySelector('#msg')
                let sentence = String($('#msg').val());
                let len = sentence.length;
                let pos = textarea.selectionStart;
                let before = sentence.substr(0, pos);
                let addCommand = ` ${LatexCommand[key]} `;
                let after = sentence.substr(pos, len);
                let currentLen = before.length + addCommand.length;
                if (key == "inline") {
                    currentLen = currentLen - 2;
                } else if (key == "display") {
                    currentLen = currentLen - 3;
                }
                sentence = before + addCommand + after;
                $('#msg').val(sentence);
                textarea.setSelectionRange(currentLen, currentLen);
                Preview.Update();
            }).tooltip({
                title: 'added!',
                placement: 'top',
                trigger: 'manual'
            }).on('shown.bs.tooltip', function () {
                setTimeout((function () {
                    $(this).tooltip('hide');
                }).bind(this), 200);
            }).on('click', function () {
                $(this).tooltip('show');
            });
        }
    });

    $('#emoji').click(() => {
        $('#emojiModal .modal-body').empty();
        for (const key of Object.keys(Emoji)) {
            let replacedKey = key.replace(/:/g, '');
            $('#emojiModal .modal-body').append(`<a id="${replacedKey}" href="#" data-toggle="tooltip">${Emoji[key]}</a>`);
            $(`#${replacedKey}`).off('click').click(() => {
                let textarea = document.querySelector('#msg')
                let sentence = String($('#msg').val());
                let len = sentence.length;
                let pos = textarea.selectionStart;
                let before = sentence.substr(0, pos);
                let addEmojiKey = ` ${key} `;
                let after = sentence.substr(pos, len);
                let currentLen = before.length + addEmojiKey;
                sentence = before + addEmojiKey + after;
                $('#msg').val(sentence);
                textarea.setSelectionRange(currentLen, currentLen);
                Preview.Update();
            }).tooltip({
                title: 'added!',
                placement: 'top',
                trigger: 'manual'
            }).on('shown.bs.tooltip', function () {
                setTimeout((function () {
                    $(this).tooltip('hide');
                }).bind(this), 200);
            }).on('click', function () {
                $(this).tooltip('show');
            });
        }
    });

    $('.btn-outline-danger').on('click', () => {
        localStorage.clear();
        location.reload(true);
    });
});
