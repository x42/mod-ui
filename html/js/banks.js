JqueryClass('bankBox', {
    init: function (options) {
        var self = $(this)

        options = $.extend({
            bankCanvas: self.find('#bank-list .js-canvas'),
            addButton: self.find('#js-add-bank'),
            pedalboardCanvas: self.find('#bank-pedalboards'),
            pedalboardCanvasMode: self.find('#bank-pedalboards-mode'),
            searchForm: self.find('#bank-pedalboards-search'),
            searchBox: self.find('input[type=search]'),
            resultCanvas: self.find('#bank-pedalboards-result .js-canvas'),
            resultCanvasMode: self.find('#bank-pedalboards-result .js-mode'),
            bankAddressing: self.find('#bank-addressings'),
            saving: $('#banks-saving'),
            list: function (callback) {
                callback([])
            },
            search: function (local, query, callback) {
                callback([])
            },
            load: function (callback) {
                callback([])
            },
            save: function (data, callback) {
                callback(true)
            }
        }, options)

        self.data(options)

        options.pedalboardCanvasMode.pedalboardsModeSelector(options.pedalboardCanvas)
        options.resultCanvasMode.pedalboardsModeSelector(options.resultCanvas)

        options.pedalboardCanvas.hide()
        options.pedalboardCanvasMode.hide()
        options.searchForm.hide()
        options.resultCanvas.hide()
        options.resultCanvasMode.hide()
        options.addButton.click(function () {
            self.bankBox('create')
        })

        var searcher = new PedalboardSearcher($.extend({
            searchbox: options.searchBox,
            //searchbutton: self.find('button.search'),
            mode: 'installed',
            render: function (pedalboard, url) {
                var rendered = self.bankBox('renderPedalboard', pedalboard)
                rendered.draggable({
                    cursor: "webkit-grabbing !important",
                    revert: 'invalid',
                    connectToSortable: options.pedalboardCanvas,
                    helper: function () {
                        var helper = rendered.clone().appendTo(self)
                            //helper.addClass('pedalboards-list-item')
                        helper.width(rendered.width())
                        return helper
                    }
                })
                self.data('resultCanvas').append(rendered)
            },
            cleanResults: function () {
                self.data('resultCanvas').html('')
            }
        }, options))

        options.pedalboardCanvas.sortable({
            cursor: "webkit-grabbing !important",
            revert: true,
            update: function (e, ui) {
                if (self.droppedBundle && !ui.item.data('pedalboardBundle')) {
                    ui.item.data('pedalboardBundle', self.droppedBundle)
                }
                self.droppedBundle = null

                // TODO the code below is repeated. The former click event is not triggered because
                // the element is cloned
                ui.item.find('.js-remove').show().click(function () {
                    ui.item.animate({
                        opacity: 0,
                        height: 0
                    }, function () {
                        ui.item.remove()
                    })
                    self.bankBox('save')
                })

                self.bankBox('save')
            },
            receive: function (e, ui) {
                // Very weird. This should not be necessary, but for some reason the ID is lost between
                // receive and update. The behaviour that can be seen at http://jsfiddle.net/wngchng87/h3WJH/11/
                // does not happens here
                self.droppedBundle = ui.item.data('pedalboardBundle')
            },
        })

        //$('ul, li').disableSelection()

        options.bankCanvas.sortable({
            handle: '.move',
            update: function () {
                self.bankBox('save')
            }
        })

        options.open = function () {
            searcher.search()
            self.bankBox('load')
            return false
        }

        /*
        var addressFactory = function (i) {
            return function () {
                var current = self.data('currentBank')
                if (!current)
                    return
                var value = parseInt($(this).val())
                current.data('addressing')[i] = value
                self.bankBox('save')
            }
        }
        for (i = 0; i < 4; i++) {
            self.find('select[name=foot-' + i + ']').change(addressFactory(i))
        }
        */

        self.window(options)
    },

    load: function () {
        var self = $(this)

        if (self.data('loaded'))
            return
        self.data('loaded', true)

        self.data('load')(function (banks) {
            self.data('bankCanvas').html('')
            if (banks.length > 0) {
                /*
                var bank, curBankTitle = self.data('currentBankTitle')
                self.data('currentBank', null)
                self.data('currentBankTitle', null)
                */

                for (var i = 0; i < banks.length; i++) {
                    /*
                    bank = self.bankBox('renderBank', banks[i], i)
                    if (curBankTitle == banks[i].title) {
                        self.bankBox('selectBank', bank)
                    }
                    */
                    self.bankBox('renderBank', banks[i], i)
                }
            }
        })
    },

    save: function () {
        var self = $(this)
        var serialized = []
        self.data('bankCanvas').children().each(function () {
            var bank = $(this)
            var pedalboards = (bank.data('selected') ? self.data('pedalboardCanvas') : bank.data('pedalboards'))
            var pedalboardData = []
            pedalboards.children().each(function () {
                pedalboardData.push({
                    title : $(this).find('.js-title').text(),
                    bundle: $(this).data('pedalboardBundle'),
                })
            })

            serialized.push({
                title: bank.find('.js-bank-title').text(),
                pedalboards: pedalboardData,
                //addressing: bank.data('addressing') || [0, 0, 0, 0],
            })
        });
        self.data('saving').html('Auto saving banks...').show()
        self.data('save')(serialized, function (ok) {
            if (ok)
                self.data('saving').html('Auto saving banks... Done!').show()
            else {
                self.data('saving').html('Auto saving banks... Error!').show()
                new Notification('error', 'Error saving banks!')
            }
            if (self.data('savingTimeout')) {
                clearTimeout(self.data('savingTimeout'))
            }
            var timeout = setTimeout(function () {
                self.data('savingTimeout', null)
                self.data('saving').hide()
            }, 500)
            self.data('savingTimeout', timeout)
        })
    },

    create: function () {
        var self = $(this)
        if(self.data('resultCanvas').children().length === 0){
            new Notification('error', 'Before creating banks you must save a pedalboard first.')
            return;    
        }
        
        bank = self.bankBox('renderBank', {
            'title': '',
            'pedalboards': []
        })
        self.bankBox('editBank', bank)
        self.bankBox('selectBank', bank)
    },

    renderBank: function (bankData) {
        var self = $(this)
        var bank = $(Mustache.render(TEMPLATES.bank_item, bankData))
        //var addressing = bankData.addressing || [0, 0, 0, 0]
        self.data('bankCanvas').append(bank)
        bank.data('selected', false)
        bank.data('pedalboards', $('<div>'))
        //bank.data('addressing', addressing)
        /*bank.data('title', bankData.title)*/

        var i, pedalboardData, rendered
        for (i = 0; i < bankData.pedalboards.length; i++) {
            rendered = self.bankBox('renderPedalboard', bankData.pedalboards[i])
            rendered.find('.js-remove').show()
            rendered.appendTo(bank.data('pedalboards'))
        }

        /*
        for (i = 0; i < 4; i++)
            self.find('select[name=foot-' + i + ']').val(addressing[i])
        */

        bank.click(function () {
            if (bank.hasClass('selected'))
                self.bankBox('editBank', bank)
            else
                self.bankBox('selectBank', bank)
        })

        bank.find('.js-remove').click(function () {
            self.bankBox('removeBank', bank)
            return false
        })

        return bank
    },

    selectBank: function (bank) {
        var self = $(this)
        var pedalboards = bank.data('pedalboards')
        var canvas = self.data('pedalboardCanvas')

        var current = self.data('currentBank')
        if (current) {
            // Save the pedalboards of the current bank
            current.data('pedalboards').append(canvas.children())
            current.data('selected', false)
            // addressing is already saved, every time select is changed
        }

        if(pedalboards.children().length == 0)
            new Notification('warning', 'This bank is empty - drag pedalboards from the right panel')

        canvas.append(bank.data('pedalboards').children())

        /*
        var addressing = bank.data('addressing')
        for (i = 0; i < 4; i++)
            self.find('select[name=foot-' + i + ']').val(addressing[i])
        */

        // Show everything
        canvas.show()
        self.data('pedalboardCanvasMode').show()
        self.data('searchForm').show()
        self.data('resultCanvas').show()
        self.data('resultCanvasMode').show()

        // Mark this bank as selected
        self.data('currentBank', bank)
        /*self.data('currentBankTitle', bank.data('title'))*/
        bank.data('selected', true)
        self.data('bankCanvas').children().removeClass('selected')
        bank.addClass('selected')

        // Show addressing bar (changed to title on 2015-12-02)
        self.data('bankAddressing').html('<h1>'+bank.text()+'</h1>')
        self.data('bankAddressing').show()
    },

    editBank: function (bank) {        
        var self = $(this)
        var titleBox = bank.find('.js-bank-title')
        if (titleBox.data('editing'))
            return true
        titleBox.data('editing', true)
        var title = titleBox.html()
        titleBox.html('')
        var editBox = $('<input>')
        editBox.val(title)
        editBox.addClass('edit-bank')
        titleBox.append(editBox)
        var finish = function () {
            var title = editBox.val() || 'Untitled'
            titleBox.data('editing', false)
            titleBox.html(title)
            self.bankBox('save')
            /*
            self.data('currentBank').data('title', title)
            self.data('currentBankTitle', title)
            */
        }
        editBox.keydown(function (e) {
            if (e.keyCode == 13) {
                finish()
            }
        })
        editBox.blur(finish)
        editBox.focus()
    },

    removeBank: function (bank) {
        var msg = "Deleting bank \""+bank.find('.js-bank-title').html()+"\". Confirm?"
        if (confirm(msg) != true) {
            return;
        }
        var self = $(this)
        var count = bank.data('pedalboards').children().length
        if (count > 1 && !confirm(sprintf('There are %d pedalboards in this bank, are you sure you want to delete it?', count)))
            return
        if (bank.data('selected')) {
            self.data('currentBank', null)
            /*self.data('currentBankTitle', null)*/
            self.data('pedalboardCanvas').html('').hide()
            self.data('pedalboardCanvasMode').hide()
            self.data('searchForm').hide()
            self.data('resultCanvas').hide()
            self.data('resultCanvasMode').hide()
            self.data('bankAddressing').hide()
        }
        bank.animate({
            opacity: 0,
            height: 0
        }, function () {
            bank.remove();
            self.bankBox('save')
        })
    },

    renderPedalboard: function (pedalboard) {
        var self = $(this)

        var metadata = {
            title: pedalboard.title,
            // FIXME: proper gif image
            image: "/img/loading-pedalboard.gif",
            // TODO: replace this with something else
            footswitches: [0, 0, 0, 0],
        }

        var rendered = $(Mustache.render(TEMPLATES.bank_pedalboard, metadata))

        // TODO is this necessary?
        rendered.addClass('js-pedalboard-item')

        // Assign remove functionality. If removal is not desired (it's a search result),
        // then the remove clickable element will be hidden
        rendered.find('.js-remove').click(function () {
            rendered.animate({
                opacity: 0,
                height: 0
            }, function () {
                rendered.remove()
            })
            self.bankBox('save')
        })

        rendered.data('pedalboardBundle', pedalboard.bundle)

        $.ajax({
            url: "/pedalboard/image/wait?bundlepath="+escape(pedalboard.bundle),
            success: function (resp) {
                if (!resp.ok) return

                rendered.find('.img img').each(function () {
                    var img = $(this)

                    // set the actual image
                    img.attr("src", "/pedalboard/image/thumbnail.png?bundlepath="+escape(pedalboard.bundle)+"&tstamp="+resp.ctime)

                    // center
                    img.css({ top: (img.parent().height() - img.height()) / 2 })
                })
            },
            error: function () {
                console.log("Pedalboard image wait error")
            },
            dataType: 'json'
        })

        return rendered
    }

})