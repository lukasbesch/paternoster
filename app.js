    var game = new Phaser.Game(1024, 768, Phaser.CANVAS, 'game');

    var PhaserGame = function () {
        
        this.options = {
            gravity:            600,
            distanceFloors:     112,
            cageDurationY:      3750,
            enemySpeed:         125,
            jumpVelocity:       100,
            maxDropDistance:    99,
        };
        
        this.bg = null;
        this.environment = null;
        this.floors = null;
        this.cages  = null;
        this.enemies  = null;
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

        },

        create: function () {
            
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
            
            //  Create moving platforms (cages)
            this.cages = this.add.physicsGroup();

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
            
            // Create enemies
            
            this.enemies = this.add.group();
            
            var enemy = new Enemy('badguy', this,  48, 176,  1, this.options.enemySpeed);
            this.enemies.add(enemy);
            
            var enemy = new Enemy('badguy2', this,  248, 276,  1, this.options.enemySpeed);
            this.enemies.add(enemy);
            
            var enemy = new Enemy('badguy3', this,  548, 376,  1, this.options.enemySpeed);
            this.enemies.add(enemy);

        },

        preRender: function () {
            
            var that = this;
            
            if (this.game.paused)
            {
                //  Because preRender still runs even if your game pauses!
                return;
            }
            
            this.enemies.forEach(function(player) {
                
                if (player.locked || player.wasLocked) {
                    
                    player.x += player.lockedTo.deltaX;
                    player.y = player.lockedTo.y - 24;
            
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
                
                return;
                
            });
            

        },

        update: function () {

        },
        
        isInRightHalf: function(item) {
            
            return (item.x + item.width * 0.5) >= this.game.world.width * 0.5;
            
        },
        
        isInLeftHalf: function(item) {
            
            return (item.x + item.width * 0.5) < this.game.world.width * 0.5;
            
        },
        
        reachingEdge: function(player, platform) {
            if (player.xSpeed <= 0 && player.x <= platform.x + player.width / 2) {
                return 'left';
            }
            if (player.xSpeed >= 0 && player.x >= platform.x + platform.width - player.width / 2) {
                return 'right';
            }
            return false;
        },
        
        canReachPlatform: function(player, platform, platformFrom) {
            
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
            
            // platform too high
            if (platform.body.y + (platform.deltaY * 10) <= player.y + player.height * 0.5) {
                return false;
            }
            
            // platform too low
            if (platform.body.y + (platform.deltaY * 10) >= player.y + player.height * 0.5 + this.options.maxDropDistance) {
                return false;
            }
            
            return true;
        },
        
        maybeEnterCage: function(player, platform) {
            var that = this;
                    
            player.game.cages.forEach(function( cage ) {
                
                if (!that.canReachPlatform(player, cage, platform)) {
                    return;
                }
                
                player.enterCage = cage;
                player.leaveCage = false;
                player.body.velocity.y = 0;
            });
            
            if (player.enterCage) {
                return true;
            }
            
            return false;
            
        },
        
        maybeLeaveCage: function(player, platform) {
            var that = this;
                    
            player.game.floors.forEach(function( floor ) {
                
                if (!that.canReachPlatform(player, floor, platform)) {
                    return;
                }
                
                player.leaveCage = player.lockedTo;
            });
            
            if (player.leaveCage) {
                
                if (player.locked) {
                    player.cancelLock(player);
                }

                player.willJump = true;
                
                return true;
            }
            
            return false;
            
        }

    };
    
    /* A cage of the lift */

    ElevatorCage = function (game, x, y, key, group) {

        if (typeof group === 'undefined') { group = game.world; }
        
        Phaser.Sprite.call(this, game, x, y, key);

        game.physics.arcade.enable(this);

        //this.anchor.x = 0.5;

        this.body.customSeparateX = true;
        this.body.customSeparateY = true;
        this.body.allowGravity = false;
        this.body.immovable = true;

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
    	this.anchor.setTo(0.5);
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
        
        this.enterFloor = false;
        this.leaveFloor = false;
    };
    	
    Enemy.prototype = Object.create(Phaser.Sprite.prototype);
    Enemy.prototype.constructor = Enemy;
    
    Enemy.prototype.update = function() {
        this.game.physics.arcade.collide(this, this.game.environment);
        
        this.game.physics.arcade.collide(this, this.game.floors, this.moveOrLeaveFloor, null, this);
        this.game.physics.arcade.collide(this, this.game.cages, this.lift, null, this);
        
        this.body.velocity.x = this.xSpeed;

        if (this.locked)
        {
            this.checkLock(this);
        }
        
    };
    
    Enemy.prototype.moveOnPlatform = function (enemy, platform) {
        var reachingEdge = this.game.reachingEdge(enemy, platform);
        if (!reachingEdge) {
            return;
        } else
        if (reachingEdge === 'left' && enemy.xSpeed < 0
            || reachingEdge === 'right' && enemy.xSpeed > 0) {
                
            enemy.xSpeed *= -1;
        }
    };
    
    Enemy.prototype.moveOrLeaveFloor = function (enemy, platform) {
        
        if (enemy.enterCage) {
            return;
        }
        
        enemy.leaveCage = false;
        enemy.enterCage = false;
        enemy.locked    = false;
        enemy.lockedTo  = false;
        
        if (this.game.maybeEnterCage(enemy, platform)) {
            return;
        }
        
        this.moveOnPlatform(enemy, platform);
        
    };
    
    Enemy.prototype.lift = function (enemy, platform) {
        
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
        
        if (this.game.maybeLeaveCage(enemy, platform)) {
            return;
        }
        
        this.moveOnPlatform(enemy, platform);
        
    };
    
    Enemy.prototype.checkLock = function (player) {
        
        player.body.velocity.y = 0;
        
        if (player.body.right < player.lockedTo.body.x || player.body.x > player.lockedTo.body.right) {
            this.cancelLock(player);
        }
    };  
    
    Enemy.prototype.cancelLock = function (player) {
        
        player.wasLocked = true;
        player.locked = false;
    
    };  
    
    game.state.add('Game', PhaserGame, true);
