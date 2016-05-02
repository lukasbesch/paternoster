    'use strict';
    
    var game = new Phaser.Game(1024, 768, Phaser.CANVAS, 'game');

    var PhaserGame = function () {
        
        this.options = {
            gravity:            600,
            distanceFloors:     112,
            cageDurationY:      3900,
            playerSpeed:        135,
            enemySpeed:         125,
            jumpVelocity:       32,
            maxDropDistance:    64,
        };
        
        this.bg = null;
        this.environment = null;
        this.floors = null;
        this.cages  = null;
        this.enemies  = null;
        
        this.player = null;
        
        this.items = null;
        this.currentScore = 0;
        this.lastScore = 0;
        this.highScore = 0;
        
        this.pauseOverlay = null;
        this.pauseText = null;
    };

    PhaserGame.prototype = {

        init: function () {

            this.game.renderer.renderSession.roundPixels = true;

            this.physics.startSystem(Phaser.Physics.ARCADE);

            this.physics.arcade.gravity.y = this.options.gravity;

        },

        preload: function () {
    
            this.load.image('sky', 'assets/sky.png');
            
            this.load.image('environment', 'assets/environment.png');
            this.load.image('platform', 'assets/platform.png');
            this.load.image('wall', 'assets/wall.png');
            
            this.load.image('lift-roof', 'assets/lift-roof.png');
            this.load.image('lift-ground', 'assets/lift-ground.png');
            
            this.load.image('cabin-roof', 'assets/cabin-roof.png');
            this.load.image('cabin-ground', 'assets/cabin-ground.png');
            this.load.image('cabin-background', 'assets/cabin-background.png');
            
            this.load.spritesheet('dude', 'assets/dude.png', 32, 48);
            this.load.spritesheet('enemy', 'assets/dude.png', 32, 48);
            
            this.load.image('scoreA', 'assets/star.png');

        },

        create: function () {
            
            var that = this;
            
            // Add a simple background
            this.bg = this.add.sprite(0, 0, 'sky').scale.setTo(1.5, 1.5);

            // Create Environment (wall)
            this.environment = this.add.physicsGroup();
            
            this.environment.create(496, 160, 'wall');
            
            this.environment.setAll('body.allowGravity', false);
            this.environment.setAll('body.immovable', true);
            
            // Create static platforms (floors)
            this.floors = this.add.physicsGroup();
            
            for (var i = 592; i >= 256; i -= this.options.distanceFloors) {
                this.floors.create(  0, i, 'platform');
                this.floors.create(640, i, 'platform');
            }

            this.floors.setAll('body.allowGravity', false);
            this.floors.setAll('body.immovable', true);
            this.floors.setAll('body.checkCollision.up',    true);
            this.floors.setAll('body.checkCollision.down',  false);
            this.floors.setAll('body.checkCollision.left',  false);
            this.floors.setAll('body.checkCollision.right', false);
            
            //  Create moving platforms (cages)
            this.cages = this.add.physicsGroup();
            this.createCages();
            
            // Score
            this.items = this.add.physicsGroup();
            this.createRandomItem();
            this.scoreText = this.add.text(16, 16, '0', { fontSize: '32px', fill: '#000' });
            
            // Create enemies
            this.enemies = this.add.physicsGroup();
            this.createEnemies();
            
            // Create Player
            this.createPlayer();
            
            this.cursors = this.input.keyboard.createCursorKeys();

        },
        
        createCages: function() {

            var cage1 = new ElevatorCage(this.game, 384, 592 + this.options.distanceFloors, 'cabin-ground', this.cages);
            
            var distanceY = this.options.distanceFloors * 5;
            var distanceX = 144;
            var durationY = this.options.cageDurationY;
            var durationX = distanceX / distanceY * durationY;
            
            cage1.addMotionPath([
                { y: "-" + distanceY, ySpeed: durationY, yEase: "Linear" },
                { x: "+" + distanceX, xSpeed: durationX, xEase: "Linear" },
                { y: "+" + distanceY, ySpeed: durationY, yEase: "Linear" },
                { x: "-" + distanceX, xSpeed: durationX, xEase: "Linear" },
            ]);

            var cage2 = new ElevatorCage(this.game, 384, 144, 'cabin-ground', this.cages);
            
            var distanceY = this.options.distanceFloors * 5;
            var distanceX = 144;
            var durationY = this.options.cageDurationY;
            var durationX = distanceX / distanceY * durationY;
            
            cage2.addMotionPath([
                { x: "+" + distanceX, xSpeed: durationX, xEase: "Linear" },
                { y: "+" + 3 * this.options.distanceFloors, ySpeed: durationY * (3/5), yEase: "Linear" },
                
                { y: "+" + 2 * this.options.distanceFloors, ySpeed: durationY * (2/5), yEase: "Linear" },
                { x: "-" + distanceX, xSpeed: durationX, xEase: "Linear" },
                
                { y: "-" + distanceY, ySpeed: durationY, yEase: "Linear" },
            ]);

            var cage3 = new ElevatorCage(this.game, 528, 368 + this.options.distanceFloors, 'cabin-ground', this.cages);
            
            var distanceY = this.options.distanceFloors * 5;
            var distanceX = 144;
            var durationY = this.options.cageDurationY;
            var durationX = distanceX / distanceY * durationY;
            
            cage3.addMotionPath([
                
                { y: "+" + 2 * this.options.distanceFloors, ySpeed: durationY * (2/5), yEase: "Linear" },
                { x: "-" + distanceX, xSpeed: durationX, xEase: "Linear" },
                
                { y: "-" + distanceY, ySpeed: durationY, yEase: "Linear" },
                { x: "+" + distanceX, xSpeed: durationX, xEase: "Linear" },
                { y: "+" + 3 * this.options.distanceFloors, ySpeed: durationY * (3/5), yEase: "Linear" },
            ]);

            this.cages.setAll('body.allowGravity', false);
            this.cages.setAll('body.immovable', true);

            this.cages.callAll('start');
        },
        
        createPlayer: function() {
            
            this.player = this.add.sprite(32, 160, 'dude');

            this.physics.arcade.enable(this.player);

            this.player.body.collideWorldBounds = true;
            this.player.body.setSize(20, 32, 5, 16);

            this.player.animations.add('left', [0, 1, 2, 3], 10, true);
            this.player.animations.add('turn', [4], 20, true);
            this.player.animations.add('right', [5, 6, 7, 8], 10, true);
        
            this.player.locked   = false;
            this.player.lockedTo = false;
            this.player.wasLocked = false;
            
            this.player.enterCage = false;
            this.player.leaveCage = false;
            
            this.player.enterFloor = false;
            this.player.leaveFloor = false;
        },
        
        createRandomItem: function() {
            
            var onFloor = this.floors.getRandom();
            
            var itemPosX = this.getRandomInt(onFloor.body.left, onFloor.body.right - 32);
            var itemPosY = onFloor.body.top - 32;
            
            this.items.create(itemPosX, itemPosY, 'scoreA');
            
            this.items.setAll('body.allowGravity', false);
            this.items.setAll('body.immovable', true);
        },
        
        removeItems: function() {
            this.items.removeAll();
        },
        
        createEnemies: function() {
            
/*            var enemy = new Enemy('badguy', this.game,  48, 176,  1, this.options.enemySpeed);
            this.enemies.add(enemy);*/
            
            /*var enemy = new Enemy('3L', this.game,  128, 320,  1, this.options.enemySpeed);
            this.enemies.add(enemy);*/
            
            var enemy = new Enemy('2L', this.game,  192, 320 + 112,  1,  this.options.playerSpeed * 0.9);
            this.enemies.add(enemy);
            
            var enemy = new Enemy('4R', this.game,  this.game.world.width - 256, 320 - 112, -1, this.options.playerSpeed * 1.6);
            this.enemies.add(enemy);
            
/*            var enemy = new Enemy('badguy3', this.game,  548, 436,  -1, this.options.enemySpeed);
            this.enemies.add(enemy);
            
            var enemy = new Enemy('badguy4', this.game,  124, 476,  1, this.options.enemySpeed);
            this.enemies.add(enemy);
            
            var enemy = new Enemy('badguy5', this.game,  758, 235,  -1, this.options.enemySpeed);
            this.enemies.add(enemy);*/
            
/*            var enemy = new Enemy('badguy6', this.game,  this.game.world.width * 0.5 - 64, 125,  1, 0);
            this.enemies.add(enemy);*/
            
        },

        preRender: function () {
            
            var that = this;
            
            if (this.game.paused)
            {
                //  Because preRender still runs even if your game pauses!
                return;
            }
            
            this.enemies.forEach(function(player) {
                
                that.preRenderPlayer(player);
                
            });
            
            this.preRenderPlayer(this.player);
        },
        
        preRenderPlayer: function(player) {
            
            var that = this;
            
            if (player.locked || player.wasLocked) {
                
                player.x += player.lockedTo.deltaX;
                player.y = player.lockedTo.y - player.height;
            
                if (player.body.velocity.x !== 0)
                {
                    player.body.velocity.y = 0;
                }
            }

            if (player.willJump)
            {
                player.willJump = false;
    
                if (player.lockedTo && player.lockedTo.deltaY < 0 && player.wasLocked)
                {
                    //  If the platform is moving up we add its velocity to the players jump
                    player.body.velocity.y = -1 * that.options.jumpVelocity + (player.lockedTo.deltaY * 10);
                }
                else
                {
                    player.body.velocity.y = -1 * that.options.jumpVelocity;
                }
    
                player.jumpTimer = that.time.time + 750;
            }
    
            if (player.wasLocked) {
                
                player.wasLocked = false;
                
                var lockedIndex = player.lockedTo.lockedPlayers.indexOf(player);
                    
                if ( lockedIndex !== -1 ) {
                    player.lockedTo.lockedPlayers.splice(lockedIndex, 1);
                }
                
                player.lockedTo = null;
            }
            
        },
        
        getRandomInt: function(min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        },
        
        update: function () {
            
            var that = this;
            
            this.physics.arcade.collide(this.player, this.items, this.increaseScore, null, this);
            this.physics.arcade.collide(this.player, this.enemies, this.playerDies, null, this);
        
            
            this.physics.arcade.collide(this.enemies, this.environment);
        
            this.physics.arcade.collide(this.enemies, this.floors, this.moveOrLeaveFloor, null, this);
            this.physics.arcade.collide(this.enemies, this.cages, this.lift, null, this);
            
            this.physics.arcade.collide(this.player, this.environment, this.gravityDeath, null, this);
            this.physics.arcade.collide(this.player, this.floors, function(player, platform) {
                if (!player.body.touching.down) {
                    //return;
                }
                player.leaveCage = false;
                player.enterCage = false;
                player.locked    = false;
                player.lockedTo  = false;
            });
            this.physics.arcade.collide(this.player, this.cages, this.customSep, null, this);
            
            //  Do this AFTER the collide check, or we won't have blocked/touching set
            var standing = this.player.body.blocked.down || this.player.body.touching.down || this.player.locked;
            
            this.player.body.velocity.x = 0;
            
            if (this.cursors.left.isDown)
            {
                this.player.body.velocity.x = -150;

                if (this.player.facing !== 'left')
                {
                    this.player.play('left');
                    this.player.facing = 'left';
                }
            }
            else if (this.cursors.right.isDown)
            {
                this.player.body.velocity.x = 150;

                if (this.player.facing !== 'right')
                {
                    this.player.play('right');
                    this.player.facing = 'right';
                }
            }
            else
            {
                if (this.player.facing !== 'idle')
                {
                    this.player.animations.stop();

                    if (this.player.facing === 'left')
                    {
                        this.player.frame = 0;
                    }
                    else
                    {
                        this.player.frame = 5;
                    }

                    this.player.facing = 'idle';
                }
            }
            
            if (standing && this.cursors.up.isDown && this.time.time > this.player.jumpTimer)
            {
                if (this.player.locked)
                {
                    this.cancelLock(this.player);
                }

                this.player.willJump = true;
            }

            if (this.player.locked)
            {
                this.checkLock(this.player);
            }
        },
        
        isInRightHalf: function(item) {
            
            return item.body.left >= this.game.world.width * 0.5;
            
        },
        
        isInLeftHalf: function(item) {
            
            return item.body.right <= this.game.world.width * 0.5;
            
        },
        
        reachingEdge: function(player, platform) {
            if (player.xSpeed <= 0 && player.body.left <= platform.body.left) {
                return 'left';
            }
            if (player.xSpeed >= 0 && player.body.right >= platform.body.right) {
                return 'right';
            }
            return false;
        },
        
        canReachPlatform: function(player, platform, platformFrom, mode) {
            
            var reachingEdge = this.reachingEdge(player, platformFrom);
            
            if (this.isInLeftHalf(player) && !this.isInLeftHalf(platform)
                || this.isInRightHalf(player) && !this.isInRightHalf(platform)) {
                return false;
            }
            
            if (player.locked) {
                if (this.isInLeftHalf(player) && reachingEdge !== 'left'
                    || this.isInRightHalf(player) && reachingEdge !== 'right') {
                    return false;
                }
            } else {
                if (this.isInLeftHalf(player) && reachingEdge !== 'right'
                    || this.isInRightHalf(player) && reachingEdge !== 'left') {
                    return false;
                }
            }
            
            var futureY;
            
            if (mode === 'toMoving') {
                
                futureY = (platform.deltaY * 5);
                
            } else {
                
                futureY = (platformFrom.deltaY * 5) * -1;
                
            }
            
            //console.info(platform.body.top, futureY, player.body.bottom, this.options.maxDropDistance);
            
            // platform too high
            if (platform.body.top + futureY < player.body.bottom) {
                //console.log('platform too high');
                //console.warn(platform.body.top + futureY, player.body.bottom);
                return false;
            } else {
                //console.log(platform.body.top + futureY, player.body.bottom);
            }
            
            // platform too low
            if (platform.body.top + futureY > player.body.bottom + this.options.maxDropDistance) {
                //console.log('platform too low', platform);
                //console.warn(platform.body.top + futureY, player.body.bottom + this.options.maxDropDistance);
                return false;
            } else {
                //console.log(platform.body.top + futureY, player.body.bottom + this.options.maxDropDistance);
            }
            
            //console.log('platform reachable');
            
            return true;
        },
        
        maybeEnterCage: function(player, platform) {
            var that = this;
            
            //console.log('maybeEnterCage');
            
            player.enterCage = false;
            
            that.cages.forEach(function( cage ) {
                
                if (true === that.canReachPlatform(player, cage, platform, 'toMoving')) {
                    player.enterCage = true;
                    player.leaveCage = false;
                    player.body.velocity.y = 0;
                }
                
            });
            
            //console.warn('player.enterCage', player.enterCage);
            
            if (player.enterCage) {
                return true;
            }
            
            return false;
            
        },
        
        maybeLeaveCage: function(player, platform) {
            var that = this;
            
            //console.log('maybeLeaveCage');
            
            player.leaveCage = false;
                    
            this.floors.forEach(function( floor ) {
                
                if (!!that.canReachPlatform(player, floor, platform, 'fromMoving')) {
                    
                    player.leaveCage = true;
                    player.enterCage = false;
                    player.body.velocity.y = 0;
                }
            });
            
            if (player.leaveCage) {
                
                if (player.locked) {
                    this.cancelLock(player);
                }

                player.willJump = true;
                
                return true;
            }
            
            return false;
            
        },
        
        gravityDeath: function (player, platform) {
            
            var deltaMax = 6;
            
            if (platform && platform.deltaY > 0) {
                deltaMax += platform.deltaY;
            }
            
            if(player.deltaY < deltaMax) {
                return false;
            }
            
            this.playerDies();
            
            return true;
        },

        customSep: function (player, platform) {
            
            if (this.gravityDeath(player, platform)) {
                return;
            }
        
            if ( !player.locked || !player.lockedTo || platform.lockedPlayers.indexOf(player) < 0 /*&& enemy.body.velocity.y > 0 */) {
                
                player.enterCage = false;
                player.leaveCage = false;
                player.locked    = true;
                player.lockedTo  = platform;
                player.lockedTo.lockedPlayers.push(player);
                
                player.body.velocity.y = 0;
                
            }

        },

        checkLock: function (player) {
        
            player.body.velocity.y = 0;
            
            if (player.body.right < player.lockedTo.body.x || player.body.x > player.lockedTo.body.right) {
                this.cancelLock(player);
            }
            return;

        },

        cancelLock: function (player) {

            player.wasLocked = true;
            player.locked = false;

        },
        
        playerDies: function () {
            
            //player.dead = true;
            //game.paused = true;
            
            var msg = "Game over!";
            
            this.lastScore = this.currentScore;
            
            if (this.lastScore > this.highScore) {
                this.lastScore = this.currentScore;
                msg += "\nNew Highscore: " + this.lastScore;
            } else {
            
                msg += "\nScore: " + this.lastScore;
                msg += "\nBest:  " + this.highScore;
                
            }
            
            if (this.pauseOverlay) { this.pauseOverlay.destroy(); }
            
            this.pauseOverlay = this.add.sprite(0, 0, 'sky');
            this.pauseOverlay.inputEnabled = true;
            this.pauseOverlay.scale.setTo(1.5, 1.5);
            
            this.pauseOverlay.events.onInputDown.add(this.restartGame, this);
        
        
            var style = { font: "bold 32px Arial", fill: "#fff", boundsAlignH: "center", boundsAlignV: "middle" };
        
            if (this.pauseText) { this.pauseText.destroy(); }
            
            //  The Text is positioned at 0, 100
            this.pauseText = this.add.text(0, 0, msg, style);
            this.pauseText.setShadow(3, 3, 'rgba(0,0,0,0.5)', 2);
        
            //  We'll set the bounds to be from x0, y100 and be 800px wide by 100px high
            this.pauseText.setTextBounds(0, this.game.world.height / 2 - 100, this.game.world.width, 200);
            
            
            this.pauseOverlay.alpha = 1;
            this.pauseText.alpha    = 1;
        },
        
        restartGame: function() {
            
            this.pauseOverlay.alpha = 0;
            this.pauseText.alpha = 0;
            console.log('now not visible', this.pauseText);
            
            this.resetScore();
            this.enemies.forEach(function(player) {
                player.destroy();
            });
            this.createEnemies();
            
            this.removeItems();
            this.createRandomItem();
            
            this.cages.removeAll();
            this.createCages();
            
            this.player.destroy();
            this.createPlayer();
            
        },
        
        increaseScore: function(player, item) {
            
            if (item.key == 'scoreA') {
                item.scoreValue = 10;
            }
            
            //console.log(item.scoreValue);
            
            this.currentScore += item.scoreValue;
            this.scoreText.text = this.currentScore;
            
            item.destroy();
            
            this.createRandomItem();
            
            if( this.items < 3 ) {
                this.time.events.add(Phaser.Timer.SECOND * this.getRandomInt(3, 8), this.createRandomItem, this);
            }
        },
        
        resetScore: function() {
            this.currentScore = 0;
            this.scoreText.text = this.currentScore;
        }

    };
    
    /* A cage of the lift */

    var ElevatorCage = function (game, x, y, key, group) {

        if (typeof group === 'undefined') { group = game.world; }
        
        Phaser.Sprite.call(this, game, x, y, key);

        game.physics.arcade.enable(this);

        //this.anchor.x = 0.5;

        this.body.customSeparateX = true;
        this.body.customSeparateY = true;
        this.body.allowGravity = false;
        this.body.immovable = true;
        
        this.body.checkCollision.up = true;
        this.body.checkCollision.down = false;
        this.body.checkCollision.left = false;
        this.body.checkCollision.right = false;

        this.lockedPlayers = [];

        group.add(this);

    };

    ElevatorCage.prototype = Object.create(Phaser.Sprite.prototype);
    ElevatorCage.prototype.constructor = ElevatorCage;

    ElevatorCage.prototype.addMotionPath = function ( motionPath ) {
        
        this.tween = this.game.add.tween(this.body)

        for (var i = 0; i < motionPath.length; i++)
        {
            if ('x' in motionPath[i]) {
                this.tween.to( { x: motionPath[i].x }, motionPath[i].xSpeed, motionPath[i].xEase);
            }
            if ('y' in motionPath[i]) {
                this.tween.to( { y: motionPath[i].y }, motionPath[i].ySpeed, motionPath[i].yEase);
            }
        }

        this.tween.loop();

    };

    ElevatorCage.prototype.start = function () {

        this.tween.start();

    };

    ElevatorCage.prototype.stop = function () {

        this.tween.stop();

    };
    
    var Enemy = function (enemyID, game, x, y, direction, speed) {
    	Phaser.Sprite.call(this, game, x, y, "enemy");
    	this.game.physics.arcade.enable(this);
    	//this.anchor.setTo(0.5);
    	this.xSpeed = direction * speed;
    	
        this.body.bounce.set(0);
        /*this.body.gravity.y = 300;*/
        this.body.collideWorldBounds = true;
        
        this.enemyID = enemyID;
        
        this.locked   = false;
        this.lockedTo = false;
        this.wasLocked = false;
        
        this.enterCage = false;
        this.leaveCage = false;

        this.animations.add('left', [0, 1, 2, 3], 10, true);
        this.animations.add('turn', [4], 20, true);
        this.animations.add('right', [5, 6, 7, 8], 10, true);
    };
    	
    Enemy.prototype = Object.create(Phaser.Sprite.prototype);
    Enemy.prototype.constructor = Enemy;
    
    Enemy.prototype.update = function() {
        
/*        this.game.physics.arcade.collide(this, this.game.environment);
        
        this.game.physics.arcade.collide(this, this.game.floors, this.moveOrLeaveFloor);
        this.game.physics.arcade.collide(this, this.game.cages, this.lift, null, this);*/
        this.body.velocity.x = this.xSpeed;

        if (this.locked)
        {
            PhaserGame.prototype.checkLock(this);
        }        
        
        if (this.xSpeed < 0)
        {
            if (this.facing !== 'left')
            {
                this.play('left');
                this.facing = 'left';
            }
        }
        else if (this.xSpeed > 0)
        {

            if (this.facing !== 'right')
            {
                this.play('right');
                this.facing = 'right';
            }
        }
        else
        {
            if (this.facing !== 'idle')
            {
                this.animations.stop();

                if (this.facing === 'left')
                {
                    this.frame = 0;
                }
                else
                {
                    this.frame = 5;
                }

                this.facing = 'idle';
            }
        }
        
    };
    
    PhaserGame.prototype.moveOnPlatform = function (enemy, platform) {
        var reachingEdge = this.reachingEdge(enemy, platform);
        if (!reachingEdge) {
            return;
        } else
        if (reachingEdge === 'left' && enemy.xSpeed < 0
            || reachingEdge === 'right' && enemy.xSpeed > 0) {
                
            enemy.xSpeed *= -1;
        }
    };
    
    PhaserGame.prototype.moveOrLeaveFloor = function (enemy, platform) {
        
        if (enemy.enterCage) {
            return;
        }
        
        enemy.leaveCage = false;
        enemy.enterCage = false;
        enemy.locked    = false;
        enemy.lockedTo  = false;
        
        if (this.maybeEnterCage(enemy, platform)) {
            return;
        }
        
        this.moveOnPlatform(enemy, platform);
        
    };
    
    PhaserGame.prototype.lift = function (enemy, platform) {
        
        if (enemy.leaveCage) {
            
            this.cancelLock(enemy);
            
            return;
        }
        
        if ( enemy.enterCage || !enemy.locked || platform.lockedPlayers.indexOf(enemy) < 0 /*&& enemy.body.velocity.y > 0 */) {
            
            enemy.enterCage = false;
            enemy.leaveCage = false;
            enemy.lockedTo  = platform;
            enemy.locked    = true;
            enemy.lockedTo.lockedPlayers.push(enemy);
            
            enemy.body.velocity.y = Math.min(0, enemy.body.velocity.y);
            
        }
        
        if (this.maybeLeaveCage(enemy, platform)) {
            return;
        }
        
        this.moveOnPlatform(enemy, platform);
        
    };
    
    PhaserGame.prototype.checkLock = function (player) {
        
        player.body.velocity.y = 0;
        
        if (player.body.right < player.lockedTo.body.x || player.body.x > player.lockedTo.body.right) {
            this.cancelLock(player);
        }
    };  
    
    PhaserGame.prototype.cancelLock = function (player) {
        
        player.wasLocked = true;
        player.locked = false;
    
    };  
    
    game.state.add('Game', PhaserGame, true);
