    var game = new Phaser.Game(1024, 768, Phaser.CANVAS, 'game');

    var PhaserGame = function () {

        this.bg = null;
        this.trees = null;

        this.player = null;

        this.stationary = null;
        this.cages = null;

        this.facing = 'left';
        this.jumpTimer = 0;
        this.cursors;
        this.locked = false;
        this.lockedTo = null;
        this.wasLocked = false;
        this.willJump = false;

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
            var background = game.add.sprite(0, 0, 'sky');
            background.scale.setTo(1.5, 1.5);

            //  Platforms that don't move
            this.stationary = this.add.physicsGroup();
            
            var floors = [];
            var floorY = 592;
            
            for (var i = 0; i < 4; i++) {
                if (i > 0) {
                    floorY -= 112;
                }
                floors.push({
                    left:  this.stationary.create(  0, floorY, 'platform'),
                    right: this.stationary.create(640, floorY, 'platform')
                });
            }
            
            var wall = this.stationary.create(496, 160, 'wall');

            this.stationary.setAll('body.allowGravity', false);
            this.stationary.setAll('body.immovable', true);

            //  Platforms that move
            this.cages = this.add.physicsGroup();

            var cage1 = new ElevatorCage(this.game, 384, 736, 'cabin-ground', this.cages);
            
            var distanceY = 592;
            var distanceX = 144;
            var durationY = 3000;
            var durationX = distanceX / distanceY * durationY;
            console.log(distanceX, distanceY, durationX, durationY);
            
            cage1.addMotionPath([
                { y: "-" + distanceY, ySpeed: durationY, yEase: "Linear" },
                { x: "+" + distanceX, xSpeed: durationX, xEase: "Linear" },
                { y: "+" + distanceY, ySpeed: durationY, yEase: "Linear" },
                { x: "-" + distanceX, xSpeed: durationX, xEase: "Linear" },
            ]);

            //  The Player
            this.player = this.add.sprite(32, 0, 'dude');

            this.physics.arcade.enable(this.player);

            this.player.body.collideWorldBounds = true;
            this.player.body.setSize(20, 32, 5, 16);

            this.player.animations.add('left', [0, 1, 2, 3], 10, true);
            this.player.animations.add('turn', [4], 20, true);
            this.player.animations.add('right', [5, 6, 7, 8], 10, true);

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

        checkLock: function () {

            this.player.body.velocity.y = 0;

            //  If the player has walked off either side of the platform then they're no longer locked to it
            if (this.player.body.right < this.lockedTo.body.x || this.player.body.x > this.lockedTo.body.right)
            {
                this.cancelLock();
            }

        },

        cancelLock: function () {

            this.wasLocked = true;
            this.locked = false;

        },

        preRender: function () {

            if (this.game.paused)
            {
                //  Because preRender still runs even if your game pauses!
                return;
            }

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

            this.physics.arcade.collide(this.player, this.stationary);
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
                this.checkLock();
            }

        }

    };

    ElevatorCage = function (game, x, y, key, group) {

        if (typeof group === 'undefined') { group = game.world; }

        Phaser.Sprite.call(this, game, x, y, key);

        game.physics.arcade.enable(this);

        this.anchor.x = 0.5;

        this.body.customSeparateX = true;
        this.body.customSeparateY = true;
        this.body.allowGravity = false;
        this.body.immovable = true;

        this.playerLocked = false;

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

    game.state.add('Game', PhaserGame, true);
