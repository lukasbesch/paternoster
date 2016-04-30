    var game = new Phaser.Game(1024, 768, Phaser.CANVAS, 'game');

    var PhaserGame = function () {

        this.bg = null;
        this.trees = null;

        this.player = null;
        this.playerSpeed = 150;
        this.playerJumpSpeed = 300;
        
        this.enemies = null;
        this.enemySpeed = this.playerSpeed * 4 / 3;
        this.enemySpeed = 100;

        this.stationary = null;
        this.platforms = null;
        this.cages = null;

        this.facing = 'left';
        this.jumpTimer = 0;
        this.cursors;
        this.locked = false;
        this.lockedTo = null;
        this.wasLocked = false;
        this.willJump = false;
        
        
        this.enemyLocked = false;
        this.enemyLockedTo = null;
        
        this.elevatorSpeedY = 4500;
        this.elevatorSpeedY = 4500;

    };

    PhaserGame.prototype = {

        init: function () {

            this.game.renderer.renderSession.roundPixels = true;

            this.physics.startSystem(Phaser.Physics.ARCADE);

            this.physics.arcade.gravity.y = 600;

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

            //  A simple background for our game
            var background = this.add.sprite(0, 0, 'sky');
            background.scale.setTo(1.5, 1.5);

            //  Environment
            this.stationary = this.add.physicsGroup();
            
            this.stationary.create(496, 160, 'wall');
            
            this.stationary.setAll('body.allowGravity', false);
            this.stationary.setAll('body.immovable', true);
            
            //  Platforms that don't move
            this.platforms = this.add.physicsGroup();
            
            var floors = [];
            var floorY = 592;
            
            for (var i = 0; i < 4; i++) {
                if (i > 0) {
                    floorY -= 112;
                }
                floors.push({
                    left:  this.platforms.create(  0, floorY, 'platform'),
                    right: this.platforms.create(640, floorY, 'platform')
                });
            }

            this.platforms.setAll('body.allowGravity', false);
            this.platforms.setAll('body.immovable', true);

            //  Platforms that move
            this.cages = this.add.physicsGroup();

            var cage1 = new ElevatorCage(this.game, 384, 736, 'cabin-ground', this.cages);
            
            var distanceY = 592;
            var distanceX = 144;
            var durationY = this.elevatorSpeedY;
            var durationX = distanceX / distanceY * durationY;
            //console.log(distanceX, distanceY, durationX, durationY);
            
            cage1.addMotionPath([
                { y: "-" + distanceY, ySpeed: durationY, yEase: "Linear" },
                { x: "+" + distanceX, xSpeed: durationX, xEase: "Linear" },
                { y: "+" + distanceY, ySpeed: durationY, yEase: "Linear" },
                { x: "-" + distanceX, xSpeed: durationX, xEase: "Linear" },
            ]);

            this.cages.setAll('body.allowGravity', false);
            this.cages.setAll('body.immovable', true);

            //  The Player
            this.player = this.add.sprite(32, 0, 'dude');

            this.physics.arcade.enable(this.player);

            this.player.body.collideWorldBounds = true;
            this.player.body.setSize(20, 32, 5, 16);

            this.player.animations.add('left', [0, 1, 2, 3], 10, true);
            this.player.animations.add('turn', [4], 20, true);
            this.player.animations.add('right', [5, 6, 7, 8], 10, true);
            
            this.enemies = this.add.group();
            
            var enemy = new Enemy(this,  48, 176,  1, this.enemySpeed);
            this.enemies.add(enemy);
            
            enemy = new Enemy(this,  480, 176,  1, this.enemySpeed);
            //this.enemies.add(enemy);
            
            enemy = new Enemy(this,  250, 500,  1, this.enemySpeed);
            //this.enemies.add(enemy);
            
            //console.log(enemy, this.enemies);
            
            this.cursors = this.input.keyboard.createCursorKeys();

            this.cages.callAll('start');

        },

        customSep: function (player, platform) {

            if (!this.locked && player.body.velocity.y > 0)
            {
                this.locked = true;
                this.lockedTo = platform;
                platform.playerLocked = true;

                player.body.velocity.y = 0;
            }

        },

        checkLock: function (player) {

            player.body.velocity.y = 0;
            
            //console.log(player);

            //  If the player has walked off either side of the platform then they're no longer locked to it
            if (player.body.right < this.lockedTo.body.x || player.body.x > this.lockedTo.body.right)
            {
                this.cancelLock();
            }

        },

        cancelLock: function () {

            this.wasLocked = true;
            this.locked = false;

        },

        preRender: function () {
            
            var that = this;

            if (this.game.paused)
            {
                //  Because preRender still runs even if your game pauses!
                return;
            }
            
            this.enemies.forEach(function(enemy){

                if (that.enemyLocked)
                {
                    enemy.x += that.enemyLockedTo.deltaX;
                    enemy.y = that.enemyLockedTo.y - 24;
                    
                    //enemy.body.velocity.x = 0;
                    enemy.body.velocity.y = 0;
                }
                
            });

            if (this.locked || this.wasLocked)
            {
                this.player.x += this.lockedTo.deltaX;
                this.player.y = this.lockedTo.y - 48;

                if (this.player.body.velocity.x !== 0)
                {
                    this.player.body.velocity.y = 0;
                }
            }

            if (this.willJump)
            {
                this.willJump = false;

                if (this.lockedTo && this.lockedTo.deltaY < 0 && this.wasLocked)
                {
                    //  If the platform is moving up we add its velocity to the players jump
                    this.player.body.velocity.y = -300 + (this.lockedTo.deltaY * 10);
                }
                else
                {
                    this.player.body.velocity.y = -300;
                }

                this.jumpTimer = this.time.time + 750;
            }

            if (this.wasLocked)
            {
                this.wasLocked = false;
                this.lockedTo.playerLocked = false;
                this.lockedTo = null;
            }

        },

        update: function () {

            this.physics.arcade.collide(this.player, this.platforms);
            this.physics.arcade.collide(this.player, this.cages, this.customSep, null, this);

            //  Do this AFTER the collide check, or we won't have blocked/touching set
            var standing = this.player.body.blocked.down || this.player.body.touching.down || this.locked;

            this.player.body.velocity.x = 0;

            if (this.cursors.left.isDown)
            {
                this.player.body.velocity.x = -150;

                if (this.facing !== 'left')
                {
                    this.player.play('left');
                    this.facing = 'left';
                }
            }
            else if (this.cursors.right.isDown)
            {
                this.player.body.velocity.x = 150;

                if (this.facing !== 'right')
                {
                    this.player.play('right');
                    this.facing = 'right';
                }
            }
            else
            {
                if (this.facing !== 'idle')
                {
                    this.player.animations.stop();

                    if (this.facing === 'left')
                    {
                        this.player.frame = 0;
                    }
                    else
                    {
                        this.player.frame = 5;
                    }

                    this.facing = 'idle';
                }
            }
            
            if (standing && this.cursors.up.isDown && this.time.time > this.jumpTimer)
            {
                if (this.locked)
                {
                    this.cancelLock();
                }

                this.willJump = true;
            }

            if (this.locked)
            {
                this.checkLock(this.player);
            }

        }

    };

    ElevatorCage = function (game, x, y, key, group) {

        if (typeof group === 'undefined') { group = game.world; }
        
        //console.log(Phaser);
        
        Phaser.Sprite.call(this, game, x, y, key);

        game.physics.arcade.enable(this);

        this.anchor.x = 0.5;

        this.body.customSeparateX = true;
        this.body.customSeparateY = true;
        this.body.allowGravity = false;
        this.body.immovable = true;

        this.playerLocked = false;
        this.enemyLocked = false;

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
    
    
    var Enemy = function (game, x, y, direction, speed) {
    	Phaser.Sprite.call(this, game, x, y, "enemy");
    	this.game.physics.arcade.enable(this);
    	this.anchor.setTo(0.5);
    	this.xSpeed = direction * speed;
    	
        this.body.bounce.y = 0.2;
        this.body.gravity.y = 300;
        this.body.collideWorldBounds = true;
    };
    	
    Enemy.prototype = Object.create(Phaser.Sprite.prototype);
    Enemy.prototype.constructor = Enemy;
    
    Enemy.prototype.update = function() {
        var that = this;
       	this.game.enemies.forEach(function(enemy) {
            that.game.physics.arcade.collide(enemy, that.game.platforms, that.moveEnemy);
            that.game.physics.arcade.collide(enemy, that.game.cages, that.liftEnemy, null, that);
            //that.game.physics.arcade.collide(enemy, that.game.cages, that.moveEnemyOnTween, null, that);
            
            //  Do this AFTER the collide check, or we won't have blocked/touching set

            //enemy.body.velocity.x = 0;
            //enemy.body.velocity.x = -66;
            enemy.body.velocity.x = enemy.xSpeed;
            
/*            console.log('enemy', enemy);
            console.log('that', that);*/
            
/*            if (enemy.enterCage) {
                console.log('enemy enterCage');
                //return;
            }*/
/*            if (enemy.inCage && that.enemyLockedTo) {
                if (enemy.x === that.enemyLockedTo.x || enemy.y === that.enemyLockedTo.y) {
                    enemy.body.velocity.x = enemy.body.velocity.x * -1;
                }
            }*/
        
            if (enemy.facing !== 'idle')
            {
                enemy.animations.stop();

                if (enemy.facing === 'left')
                {
                    enemy.frame = 0;
                }
                else
                {
                    enemy.frame = 5;
                }

                enemy.facing = 'idle';
            }

            if (this.enemyLocked)
            {
                that.checkLock(enemy);
            }
            
       	});
        //this.physics.arcade.collide(this.player, this.cages, this.customSep, null, this);
        //this.body.velocity.x = this.xSpeed;
    };
    
    Enemy.prototype.moveEnemy = function (player, platform) {
        
        console.log('moveEnemy');
        
        if (platform.x <= 0 && player.xSpeed >= 0 && player.x >= platform.x + platform.width - player.width) {
            player.game.cages.forEach(function( cage ) {
                
                // check if platform is below player
                
                console.log(cage.body.y <= player.y + player.height , cage.body.y >= player.y + player.height + 144);
                if (cage.body.y <= player.y + player.height || cage.body.y >= player.y + player.height + 144) {
                    return;
                }
                
                var leftTop = cage.x;
                var rightTop = leftTop + cage.width;
                
                var distance = Math.min(
                    player.game.physics.arcade.distanceToXY( player, leftTop, cage.y ),
                    player.game.physics.arcade.distanceToXY( player, rightTop, cage.y )
                );
                
                if( distance > 144 ) {
                    return;
                }
                
                if (cage.body.y >= player.y && cage.body.y <= player.y + 144) {
                    
                    platform.enemyLocked = true;
                    
                    player.enterCage = true;
                    player.body.velocity.y = 0;
                    
                }
            });
        }
        
        if (player.enterCage) {
            return;
        }
        
        if (platform.x >= player.game.world.width - platform.width &&
            (player.xSpeed <= 0 && player.x <= platform.x)) {
        
            console.log('1');
        }
        
    	if (player.xSpeed >= 0 && player.x >= platform.x + platform.width - player.width
    	 || player.xSpeed <= 0 && player.x <= platform.x + 16) {
    		player.xSpeed *= -1;
    	}	
    };
    
    Enemy.prototype.liftEnemy = function (player, platform) {
        console.log('liftEnemy');
        
        var movedToLeftEdge  = player.xSpeed <= 0 && player.x <= platform.x - player.width;
        var movedToRightEdge = player.xSpeed >= 0 && player.x <= platform.x - player.width + platform.width;
        
/*        console.log('liftEnemy');
        console.log(player.game, player.game.enemyLocked);*/
        
        player.inCage = true;
        player.enterCage = false;

        if (!player.game.enemyLocked && player.body.velocity.y > 0)
        {
            console.log('lock enemy');
            player.game.enemyLocked = true;
            player.game.enemyLockedTo = platform;
            platform.enemyLocked = true;

            player.body.velocity.y = 0;
/*            player.body.velocity.x = 0;
            player.body.velocity.x = player.xSpeed;*/
        }
                
        console.log(movedToLeftEdge, movedToRightEdge);
        
        
        if (movedToLeftEdge || movedToRightEdge) {
            player.game.platforms.forEach(function( stationaryPlatform ) {
                   
                // check if platform is below player
                if (stationaryPlatform.body.y >= player.y + player.height || stationaryPlatform.body.y >= player.y + player.height + 144) {
                    return;
                }
                
                var distanceL  = player.game.physics.arcade.distanceToXY( player, stationaryPlatform.x, stationaryPlatform.y );
                var distanceR = player.game.physics.arcade.distanceToXY( player, stationaryPlatform.x + stationaryPlatform.width, stationaryPlatform.y );
                
                var distance = Math.min(distanceL, distanceR);
                
                if( distance > 144 ) {
                    return;
                }
                    
                player.game.enemyLocked = false;
                player.game.enemyLockedTo = null;
                platform.enemyLocked = false;
                
                player.leaveCage = ( distance == distanceL ) ? 'left' : 'right';
                player.body.velocity.y = 0;
            });
           
        }
        
        if (player.leaveCage === 'left') {
           return;
        }
        
        if (player.leaveCage === 'right') {
           return;
        }
        
        if (!!player.leaveCage) {
            return;
        }
            
       /* console.log(
            player.xSpeed,
            player.x >= platform.x + platform.width - player.width,
            '|',
            player.x,
            platform.x + platform.width - player.width - 10,
            '|',
            platform.x,
            platform.width,
            player.width,
            platform,
            player
        );*/
        
        if (player.xSpeed >= 0 && player.x >= platform.x + platform.width - player.width - 42
         || player.xSpeed <= 0 && player.x <= platform.x - player.width) {
             
            
        	player.xSpeed *= -1;
        }
        
/*        if (enemy.x === that.enemyLockedTo.x || enemy.y === that.enemyLockedTo.y) {
            enemy.body.velocity.x = enemy.body.velocity.x * -1;
        }*/
        
    };
    
    Enemy.prototype.checkLock = function (player) {

        player.body.velocity.y = 0;
        
        //console.log(player);

        //  If the player has walked off either side of the platform then they're no longer locked to it
/*        if (player.body.right < this.enemyLockedTo.body.x || player.body.x > this.enemyLockedTo.body.right)
        {
            this.cancelLock();
        }*/
    };

    game.state.add('Game', PhaserGame, true);
