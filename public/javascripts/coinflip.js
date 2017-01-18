$(function() {

  var $pageContent = $('.page-content');
  var $promoInput = $('#cf-promo-input');
  var $promoSubmit = $('#cf-promo-submit');
  var $refreshGame = $('#cf-games-reload');

  var $online = $('#cf-online');
  var $totalWagered = $('#cf-wagered');
  var $openGames = $('#cf-open-games');

  var $createGame = $('#create-game');
  var $gamesLoader = $('.cf-games-loader');
  var $gamesTable = $('.cf-games-table');
  var $tableWrapper = $('#cf-table-wrapper');
  var $userHistory = $('#cf-user-history-table');
  var $userHistoryCounter = $('#user-game-amount');
  var $history = $('#cf-history-table');
  var $historyCounter = $('#history-game-amount');
  var $leaderboards = $('#cf-leaderboards-table');

  var $inputRange = $('#cf-input-range');
  var $inputAmount = $('#cf-amount-input');
  var $finalizeGame = $('#finalize-game');
  var $tCoin = $('#t-coin');
  var $ctCoin = $('#ct-coin');

  var $gameModal = $('#cf-game-modal');
  var $gameModalId = $('#cf-game-id');
  var $gameModalHash = $('#cf-hash-code');
  var $gameModalCoin = $('#ct-and-t');
  var $gameModalLeftName = $('#cf-user-name-left');
  var $gameModalRightName = $('#cf-user-name-right');
  var $gameModalLeftImage = $('#img-user-left');
  var $gameModalRightImage = $('#img-user-right');
  var $gameModalLeftCoin = $('#cf-coin-left');
  var $gameModalRightCoin = $('#cf-coin-right');
  var $gameModalLeftAmount = $('#cf-money-left');
  var $gameModalRightAmount = $('#cf-money-right');
  var $gameModalJoin = $('#cf-game-join-btn');
  var $gameModalCountdown = $('#cf-game-countdown');
  var $gameModalFlipContainer = $('#flip-toggle');

  var socket_incoming = {
    COINFLIP_INIT: 'COINFLIP_IN_INIT_COINFLIP',
    PROMO_CODE_END: 'PROMO_CODE_END',
    COINFLIP_USER_HISTORY_DATA: 'COINFLIP_IN_USER_HISTORY_DATA',
    COINFLIP_CURRENT_GAMES_DATA: 'COINFLIP_IN_CURRENT_GAMES_DATA',
    COINFLIP_ADD_GAME: 'COINFLIP_IN_ADD_GAME',
    COINFLIP_UPDATE_GAME: 'COINFLIP_IN_UPDATE_GAME',
    COINFLIP_UPDATE_GLOBAL_HISTORY: 'COINFLIP_IN_UPDATE_GLOBAL_HISTORY',
    COINFLIP_UPDATE_USER_HISTORY: 'COINFLIP_IN_UPDATE_USER_HISTORY',
    COINFLIP_UPDATE_LEADERBOARDS: 'COINFLIP_IN_UPDATE_LEADERBOARDS',
    COINFLIP_UPDATE_TOTAL_WAGERED: 'COINFLIP_IN_UPDATE_TOTAL_WAGERED',
    INCREMENT_ONLINE: 'CHAT_IN_INCREMENET_ONLINE',
    DECREMENT_ONLINE: 'CHAT_IN_DECREMENT_ONLINE',
    UPDATE_ONLINE: 'UPDATE_ONLINE'
  };

  var socket_outgoing = {
    COINFLIP_INIT: 'COINFLIP_OUT_INIT_COINFLIP',
    REQUEST_PROMO_CODE: 'REQUEST_PROMO_CODE',
    COINFLIP_REQUEST_CURRENT_GAMES: 'COINFLIP_OUT_REQUEST_CURRENT_GAMES',
    COINFLIP_CREATE_GAME: 'COINFLIP_OUT_CREATE_GAME',
    COINFLIP_JOIN_GAME: 'COINFLIP_OUT_JOIN_GAME'
  };

  var gameType = {
    CURRENT: 1,
    HISTORY: 2,
    USER_HISTORY: 3,
    LEADERBOARDS: 4
  };

  var updateType = {
    IN_PROGRESS: 1,
    COMPLETED: 2
  };

  var self;
  var desc = true;
  var watching = null;
  var modalTimeout, modalInterval;

  var MIN_BET = 0.50;
  var MAX_BET = 400.00;
  var MAX_USER_HISTORY_AMOUNT = 20;
  var MAX_GLOBAL_HISTORY_AMOUNT = 40;

  var COMPLETED_TIMEOUT = 30 * 1000;

  function CoinflipManager() {
    this.socket = socket;

    self = this;

    this.socket.on(socket_incoming.COINFLIP_INIT, this.initCoinflip);
    this.socket.on(socket_incoming.UPDATE_ONLINE, this.updateOnline);
    this.socket.on(socket_incoming.COINFLIP_USER_HISTORY_DATA, this.loadUserHistoryFromSocket);
    this.socket.on(socket_incoming.COINFLIP_CURRENT_GAMES_DATA, this.loadCurrentGamesFromSocket);
    this.socket.on(socket_incoming.COINFLIP_ADD_GAME, this.addGame);
    this.socket.on(socket_incoming.COINFLIP_UPDATE_GAME, this.updateGame);
    this.socket.on(socket_incoming.COINFLIP_UPDATE_USER_HISTORY, this.loadUserHistoryFromSocket);
    this.socket.on(socket_incoming.COINFLIP_UPDATE_GLOBAL_HISTORY, this.loadGlobalHistoryFromSocket);
    this.socket.on(socket_incoming.COINFLIP_UPDATE_LEADERBOARDS, this.loadLeaderboardsFromSocket);
    this.socket.on(socket_incoming.COINFLIP_UPDATE_TOTAL_WAGERED, this.updateTotalWagered);

    this.socket.emit(socket_outgoing.COINFLIP_INIT);
  }

  CoinflipManager.prototype.initCoinflip = function(data) { //data.online, data.total_wagered, data.games, data.history, data.leaderboards
    $gamesLoader.hide();
    $online.text(data.online);
    self.updateTotalWagered(data);

    self.currentGames = data.games;
    self.globalHistory = data.history;
    self.leaderboards = data.leaderboards;

    self.initData();
  }

  /*
   *  COINNFLIP OBJECT:
   *    _id (unique identifier for each game)
   *    creator_name (name of the creator)
   *    creator_img (img of the creator)
   *    joiner_name (name of the joiner)
   *    joiner_img (img of the joiner)
   *    starting_face (face the coinflip game is created on (1 == tails, 0 == heads))
   *    winning_face (face of the coinflip game created)
   *    amount (number of credits the game entry is)
   *    winner_name (name of the winner)
   *    winner_img (img of the winner)
   *    user_name (name of the user for user_history)
   *    user_img (img of the user for user_history)
   *    won (boolean value if the user won for user_history)
   *    completed (boolean value if the game is completed)
   *    date_created (date time the game was created)
   */
  CoinflipManager.prototype.initData = function() {
    this.loadCurrentGames(true);
    this.loadGlobalHistory();
    this.loadLeaderboards();
    this.loadUserHistory();
  }

  CoinflipManager.prototype.updateOnline = function(data) {
    $online.text(data.users);
  }

  CoinflipManager.prototype.updateTotalWagered = function(data) { //data.total_wagered
    if (data.total_wagered) {
      var start = Number($totalWagered.text().replace(/\,/g,''));
      var end = Number(data.total_wagered);
      $totalWagered.countup({
        startVal: start,
        endVal: end,
        decimals: 2
      });
    }
  }

  CoinflipManager.prototype.updateOpenGames = function() {
    var end = 0;
    for (var index in self.currentGames) {
      var game = self.currentGames[index];
      if (!(game.local_in_progress == true || game.local_completed == true)) {
        end++;
      }
    }
    var start = Number($openGames.text().replace(/\,/g,''));
    $openGames.countup({
      startVal: start,
      endVal: end
    });
  }

 /*
  * <div class="cf-tr">
  *   <div class="cf-td" id="cf-td-profile"><img id="cf-profile" src="images/large-logo-bg.png"></img><span>mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm</span></div>
  *   <div class="cf-td" id="cf-td-status"><span>Join</span></div>
  *   <div class="cf-td" id="cf-td-side"><span>456.32</span><img id="cf-side" class="t-coin"></img></div>
  * </div>
  */
  CoinflipManager.prototype.loadCurrentGames = function() {
    $gamesTable.empty();
    $tableWrapper.show();
    self.updateOpenGames();

    sortCoinflipGames(this.currentGames, desc);

    for (var index in this.currentGames) {
      var game = this.currentGames[index];
      formatGame(game);
      $gamesTable.append('<div class="cf-tr" game-id="' + game._id + '">' +
                            '<div class="cf-td" id="cf-td-profile">' +
                              '<img id="cf-profile" src="' + game.creator_img + '"></img>' +
                              '<span>' + game.creator_name + '</span>' +
                            '</div>' +
                            '<div id="cf-td-status" class="cf-td ' + (game.local_completed ? 'completed' : (game.local_in_progress ? 'in_progress' : 'join')) + '">' +
                              '<span>' + (game.local_completed ? 'Completed' : (game.local_in_progress ? 'In Progress' : 'Join')) + '</span>' +
                            '</div>' +
                            '<div class="cf-td" id="cf-td-side">' +
                              '<span>' + (Number(game.amount).toFixed(2)) + '</span>' +
                              '<img id="cf-side" class="' + (game.starting_face == 0 ? 't-coin' : 'ct-coin') + '"</img>' +
                            '</div>' +
                          '</div>');

    }

    if (this.currentGames.length == 0) {
      $tableWrapper.addClass('empty');
    } else {
      $tableWrapper.removeClass('empty');
    }
  }

  CoinflipManager.prototype.loadCurrentGamesFromSocket = function(data) {
    self.currentGames = data.games;
    self.loadCurrentGames();
  }

  CoinflipManager.prototype.refreshCurrentGames = function() {
    $tableWrapper.parent().find('.cf-games-loader').show();
    $tableWrapper.hide();
    socket.emit(socket_outgoing.COINFLIP_REQUEST_CURRENT_GAMES, function(data) {
      $tableWrapper.parent().find('.cf-games-loader').hide();
      self.loadCurrentGamesFromSocket(data);
    });
  }

  /*
   * <tr>
   *  <td id="history-side"><img class="t-coin"></img></td>
   *  <td id="history-user"><img src="images/large-logo-bg.png"></img><span>mprey</span></td>
   *  <td id="history-amount"><span>5.45</span></td>
   * </tr>
   */

  CoinflipManager.prototype.loadGlobalHistory = function() {
    $history.empty();
    $historyCounter.text(this.globalHistory.length);

    for (var index in this.globalHistory) {
      var game = this.globalHistory[index];
      formatGame(game);
      $history.append('<tr game-id="' + game._id + '">' +
                        '<td id="history-side"><img class="' + (game.winning_face == 0 ? 't-coin' : 'ct-coin') + '"></img></td>' +
                        '<td id="history-user"><img src="' + game.winner_img + '"></img><span>' + game.winner_name + '</span></td>' +
                        '<td id="history-amount"><span>' + game.amount + '</span></td>' +
                      '</tr>');
    }

    if (this.globalHistory.length == 0) {
      $history.parent().addClass('empty');
    } else {
      $history.parent().removeClass('empty');
    }
  }

  CoinflipManager.prototype.loadGlobalHistoryFromSocket = function(data) {
      self.globalHistory = data.global_history;
      self.loadGlobalHistory();
  }

  /*
   * <tr>
   *  <td id="history-side"><img class="t-coin"></img></td>
   *  <td id="history-user"><img src="images/large-logo-bg.png"></img><span>mprey</span></td>
   *  <td id="history-amount"><span class="lost">5.45</span></td>
   </tr>
   */
  CoinflipManager.prototype.loadUserHistory = function() {
    if (!this.userHistory) {
      $userHistory.parent().find('.cf-games-loader').show();
      return;
    } else {
      $userHistory.parent().find('.cf-games-loader').hide();
    }

    $userHistory.empty();
    $userHistoryCounter.text(this.userHistory.length);

    for (var index in this.userHistory) {
      var game = this.userHistory[index];
      formatGame(game);
      $userHistory.append('<tr game-id="' + game._id + '">' +
                            '<td id="history-side"><img class="' + (game.winning_face == 0 ? 't-coin' : 'ct-coin') + '"></img></td>' +
                            '<td id="history-user"><img src="' + game.winner_img + '"></img><span>' + game.winner_name + '</span></td>' +
                            '<td id="history-amount"><span class="' + (game.won ? 'won' : 'lost') + '">' + game.amount + '</span></td>' +
                          '</tr>');
    }

    if (this.userHistory.length == 0) {
      $userHistory.parent().addClass('empty');
    } else {
      $userHistory.parent().removeClass('empty');
    }
  }


  CoinflipManager.prototype.loadUserHistoryFromSocket = function(data) {
    self.userHistory = data.user_history;
    self.loadUserHistory();
  }

  /*
   * <tr>
   *  <td id="history-side"><span>1.</span></td>
   *  <td id="history-user"><img src="images/large-logo-bg.png"></img><span>fuck u</span></td>
   *  <td id="history-amount"><span class="record">5.45</span></td>
   * </tr>
   */
  CoinflipManager.prototype.loadLeaderboards = function() {
    $leaderboards.empty();

    for (var index in this.leaderboards) {
      var game = this.leaderboards[index];
      formatGame(game);
      var place = Number(index) + 1;
      $leaderboards.append('<tr game-id="' + game._id + '">' +
                             '<td id="history-side"><span>' + (place) + '.</span></td>' +
                             '<td id="history-user"><img src="' + game.winner_img + '"></img><span>' + game.winner_name + '</span></td>' +
                             '<td id="history-amount"><span class="record">' + game.amount + '</span></td>' +
                           '</tr>');
    }
  }

  CoinflipManager.prototype.loadLeaderboardsFromSocket = function(data) {
    self.leaderboards = data.leaderboards;
    self.loadLeaderboards();
  }

  CoinflipManager.prototype.addGame = function(data) {
    self.currentGames.push(data.game);
    self.loadCurrentGames();
  }

  CoinflipManager.prototype.createGame = function(side, amount) {
    $.modal.getCurrent().showSpinner();

    socket.emit(socket_outgoing.COINFLIP_CREATE_GAME, {
      side: side,
      amount: amount
    }, self.finishGameCreation);
  }

  CoinflipManager.prototype.updateGame = function(data) { //data.game, //data.type
    if (!data.game || !data.type) {
      return;
    }

    var gameObj = findCoinflipGame(data.game._id, gameType.CURRENT);

    updateCoinflipGame(gameObj, data.game);

    if (data.type == updateType.IN_PROGRESS) {
      gameObj.local_in_progress = true;
      $('.cf-tr[game-id="' + data.game._id + '"]').find('#cf-td-status').removeClass('join completed').addClass('in_progress').find('span').text('In Progress');

      if (watching == data.game._id) {
        self.promptGameView(data.game._id, true);
        return;
      }
    } else if (data.type == updateType.COMPLETED) {
      gameObj.local_in_progress = false;
      gameObj.local_completed = true;
      $('.cf-tr[game-id="' + data.game._id + '"]').find('#cf-td-status').removeClass('join in_progress').addClass('completed').find('span').text('Completed');
      self.updateOpenGames();

      setTimeout(function() {
        removeCurrentGame(gameObj._id);
        $('.cf-tr[game-id="' + data.game._id + '"]').remove();

        if (self.currentGames.length == 0) {
          self.loadCurrentGames();
        }
      }, COMPLETED_TIMEOUT);
    }
  }

  CoinflipManager.prototype.finishGameCreation = function(error, game) {
    $.modal.getCurrent().hideSpinner();
    $.modal.close();

    if (game && !error) {
      self.addGame({
        game: game
      });
    } else if (error) {
      swal('Game Error', 'Error while creating the coinflip game: ' + error, 'error');
    }
  }

  CoinflipManager.prototype.promptGameView = function(gameId, ignoreModal, gameType) {
    var game = findCoinflipGame(gameId, gameType);

    if (!game) return;

    $gameModalJoin.show();
    $gameModalJoin.removeClass('loading');
    $gameModalCountdown.hide();
    $gameModalCoin.show();
    $gameModalFlipContainer.removeClass('flip-t flip-ct').hide();

    $gameModalId.text(game._id);
    $gameModalHash.text(game.hash_code);
    $gameModalCountdown.text('...');

    $gameModalLeftName.text(escapeHTML(game.creator_name));
    $gameModalLeftImage.attr('src', game.creator_img);
    $gameModalLeftAmount.countup({
      startVal: 0,
      endVal: game.amount,
      decimals: 2
    });

    if (game.joiner_name) {
      $gameModalRightName.text(escapeHTML(game.joiner_name));
      $gameModalRightImage.attr('src', game.joiner_img);
      $gameModalRightAmount.countup({
        startVal: 0,
        endVal: game.amount,
        decimals: 2
      });
    } else {
      $gameModalRightName.text('Waiting...');
      $gameModalRightImage.attr('src', 'images/unknown.png');
      $gameModalRightAmount.text('0.00');
    }

    $gameModalLeftCoin.removeClass('t-coin ct-coin');
    $gameModalRightCoin.removeClass('t-coin ct-coin');
    if (game.starting_face == 0) {
      $gameModalLeftCoin.addClass('t-coin');
      $gameModalRightCoin.addClass('ct-coin');
    } else {
      $gameModalLeftCoin.addClass('ct-coin');
      $gameModalRightCoin.addClass('t-coin');
    }

    if (!ignoreModal) {
      $gameModal.modal();
    }

    if (game.in_progress == true || game.completed == true) {
      self.watchGame(game);
    }

    watching = game._id;
  }

  CoinflipManager.prototype.watchGame = function(game) {
    $gameModalJoin.hide();
    $gameModalCountdown.show();

    $gameModalRightAmount.countup({
      startVal: 0,
      endVal: game.amount,
      decimals: 2
    });

    var counter = 5;
    modalInterval = setInterval(function() {
      counter--;

      if (counter < 4 && counter > 0) {
        $gameModalCountdown.addClass('grow');
        $gameModalCountdown.text(counter + '');
      }
      if (counter == 0) {
        clearInterval(modalInterval);
        $gameModalCountdown.removeClass('grow');
        self.animateCoinflip(game.winning_face, function() {
          $gameModalCountdown.text('');

          if (game.id_winner == game.id_creator) {
            $gameModalLeftAmount.countup({
              startVal: $gameModalLeftAmount.text().replace(/\,/g,''),
              endVal: game.amount * 2,
              decimals: 2
            });
            $gameModalRightAmount.countup({
              startVal: $gameModalRightAmount.text().replace(/\,/g,''),
              endVal: 0,
              decimals: 2
            });
          } else {
            $gameModalLeftAmount.countup({
              startVal: $gameModalLeftAmount.text().replace(/\,/g,''),
              endVal: 0,
              decimals: 2
            });
            $gameModalRightAmount.countup({
              startVal: $gameModalRightAmount.text().replace(/\,/g,''),
              endVal: game.amount * 2,
              decimals: 2
            });
          }

         });
      }
    }, 1000);
  }

  CoinflipManager.prototype.animateCoinflip = function(side, done) {
    $gameModalCountdown.text('Flipping...');
    $gameModalCoin.hide();
    $gameModalFlipContainer.show();

    if (side == 0) {
      $('#flip-toggle').toggleClass('flip-t');
    } else {
      $('#flip-toggle').toggleClass('flip-ct');
    }

    modalTimeout = setTimeout(done, 4700);
  }

  new CoinflipManager();

  $history.on('click', 'tr', function(event) {
    self.promptGameView($(this).attr('game-id'), false, gameType.HISTORY);
  });

  $userHistory.on('click', 'tr', function(event) {
    self.promptGameView($(this).attr('game-id'), false, gameType.USER_HISTORY);
  });

  $gameModalJoin.on('click', function(event) {
    if (!isNaN(watching) && !$(this).hasClass('loading')) {
      $(this).addClass('loading');
      socket.emit(socket_outgoing.COINFLIP_JOIN_GAME, {
        game_id: watching
      }, function(err) {
        if (err) {
          $.modal.close();
          swal('Game Error', err, 'error');
        }
        $gameModalJoin.removeClass('loading');
      });
    }
  });

  $gameModal.on($.modal.AFTER_CLOSE, function() {
    clearTimeout(modalTimeout);
    clearInterval(modalInterval);
    watching = null;
  });

  $tableWrapper.on('click', '#cf-td-status', function(event) {
    self.promptGameView($(this).parent().attr('game-id'));
  });

  $finalizeGame.on('click', function(event) {
    var side = 0;
    if ($ctCoin.hasClass('selected')) {
      side = 1;
    }
    var amount = $inputAmount.val();
    if (!$.isNumeric(amount)) {
      toastr.error('Unable to parse input: ' + amount, 'Error');
      return;
    }

    self.createGame(side, amount);
  });

  $tCoin.on('click', function(event) {
    if (!$(this).hasClass('selected')) {
      $(this).addClass('selected');
    }
    $ctCoin.removeClass('selected');
  });

  $ctCoin.on('click', function(event) {
    if (!$(this).hasClass('selected')) {
      $(this).addClass('selected');
    }
    $tCoin.removeClass('selected');
  });

  $createGame.on('click', function(event) {
    if ($.isNumeric($('#balance-label').text())) {
      var balance = $('#balance-label').text();
      var value = balance * 0.3;
      if (!(value > MIN_BET)) {
        value = 0.50;
      }
      if (balance > MAX_BET) {
        balance = MAX_BET;
        value = MAX_BET * 0.3;
      }
      $inputRange.attr({
        max: balance
      });
      $inputAmount.val(value.toFixed(2));
      $inputRange.val(value.toFixed(2));
    }
  });

  $inputRange.on('input change', function(event) {
    $inputAmount.val(Number($inputRange.val()).toFixed(2));
  });

  $inputAmount.on('change keyup paste', function(event) {
    if ($.isNumeric($inputAmount.val())) {
      $inputRange.val($inputAmount.val());
    }
  });

  $refreshGame.on('click', function(event) {
    event.preventDefault();
    self.refreshCurrentGames();
  });

  $pageContent.on('click', '#cf-dropdown-trigger', function(event) {
    var header = $(this).parent().parent();
    $(this).hide();
    if ($(this).hasClass('opened')) {
      $(this).next('#cf-dropdown-trigger').show();
    } else {
      $(this).prev('#cf-dropdown-trigger').show();
    }
    header.addClass('border-bottom');
    $(this).parent().parent().parent().find('.table-wrapper').slideToggle(function() {
      if (!($(this).is(':visible'))) {
        header.removeClass('border-bottom');
      }
    });
  });

  $pageContent.on('click', '#cf-sort-button', function(event) {
    $(this).hide();
    if ($(this).hasClass('asc')) {
      desc = true;
      $(this).next('#cf-sort-button').show();
    } else {
      desc = false;
      $(this).prev('#cf-sort-button').show();
    }
    self.loadCurrentGames();
  });

  socket.on(socket_incoming.PROMO_CODE_END, function() {
    $promoInput.removeClass('focus');
    $promoSubmit.removeClass('submitting');
    $promoSubmit.hide();
  });

  $promoInput.focus(function() {
    $(this).addClass('focus');
    $promoSubmit.show();
  });

  $promoSubmit.on('click', function(event) {
    if ($promoInput.val() && !$(this).hasClass('submitting')) {
      $(this).addClass('submitting');

      var code = $promoInput.val();
      socket.emit(socket_outgoing.REQUEST_PROMO_CODE, {
        code: code
      });
    } else {
      toastr.warning('Please enter a code before submitting.', 'Promo Code');
    }
  });

  function updateCoinflipGame(to, from) {
    for (var i in from) {
      to[i] = from[i];
    }
  }

  function removeCurrentGame(gameId) {
    for (var index in self.currentGames) {
      var game = self.currentGames[index];
      if (game._id == gameId) {
        self.currentGames.splice(index, 1);
        return;
      }
    }
  }

  function findCoinflipGame(gameId, type) {
    var array = [];
    if (!type || type == gameType.CURRENT) {
      array = self.currentGames;
    } else if (type == gameType.HISTORY) {
      array = self.globalHistory;
    } else if (type == gameType.USER_HISTORY) {
      array = self.userHistory;
    } else if (type == gameType.LEADERBOARDS) {
      array = self.leaderboards;
    }
    for (var index in array) {
      var game = array[index];
      if (game._id == gameId) return game;
    }
  }

  function formatGame(obj) {
    if (obj.hasOwnProperty("joiner_name")) {
      obj.joiner_name = escapeHTML(obj.joiner_name);
      obj.in_progress = true;
    } else {
      obj.in_progress = false;
    }
    if (obj.hasOwnProperty("user_name")) {
      obj.user_name = escapeHTML(obj.user_name);
    }
    if (obj.hasOwnProperty("winner_name")) {
      obj.winner_name = escapeHTML(obj.winner_name);
    }
    if (obj.hasOwnProperty("creator_name")) {
      obj.creator_name = escapeHTML(obj.creator_name);
    }
    if (obj.hasOwnProperty("amount")) {
      obj.amount = Number(obj.amount).toFixed(2);
    }
  }

  function sortCoinflipGames(array, desc) {
    array.sort(function(a, b) {
      return desc ? b.amount - a.amount : a.amount - b.amount;
    });
  }

  function escapeHTML(unsafe) {
    return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function blurPromoInput() {
    $promoInput.removeClass('focus');
    $promoSubmit.hide();
  }

  window.coinflipManager = self;

});
