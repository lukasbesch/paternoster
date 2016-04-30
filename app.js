    var game = new Phaser.Game(1024, 768, Phaser.CANVAS, 'game');

    var PhaserGame = function () {
        
        this.options = {
            gravity:            600,
            distanceFloors:     112,
            cageDurationY:      3000,
            enemySpeed:         150,
            maxDropDistance:    112
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

            this.cages.setAll('body.allowGravity', false);
            this.cages.setAll('body.immovable', true);

            this.cages.callAll('start');
            
            // Create enemies
            
            this.enemies = this.add.group();
            
            var enemy = new Enemy('badguy', this,  48, 176,  1, this.options.enemySpeed);
            this.enemies.add(enemy);

        },

        preRender: function () {

            if (this.game.paused)
            {
                //  Because preRender still runs even if your game pauses!
                return;
            }
            
            this.cages.forEach(function(cage){
                
                if (cage.lockedPlayers.length <= 0) {
                    return;
                }
                
                cage.lockedPlayers.forEach(function(player) {
                    
                    player.body.velocity.y = 0;
                    
                    player.x += cage.deltaX;
                    player.y  = cage.y - 24;
                });
                
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
        
        maybeEnterCage: function(player, platform) {
            var that = this;
                    
            player.game.cages.forEach(function( cage ) {
                
                // platform too high
                if (cage.body.y <= player.y + player.height * 0.5) {
                    return;
                }
                // platform too low
                if (cage.body.y >= player.y + player.height * 0.5 + that.options.maxDropDistance) {
                    return;
                }
                
                var leftTop = cage.x;
                var rightTop = leftTop + cage.width;
                
                var distance = Math.min(
                    player.game.physics.arcade.distanceToXY( player, leftTop, cage.y ),
                    player.game.physics.arcade.distanceToXY( player, rightTop, cage.y )
                );
                
                if( distance > that.options.maxDropDistance ) {
                    return;
                }
                
                player.enterCage = cage;
                player.body.velocity.y = 0;
            });
            
            if (player.enterCage) {
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
    	
        this.body.bounce.y = 0.2;
        this.body.gravity.y = 300;
        this.body.collideWorldBounds = true;
        
        this.enemyID = enemyID;
        
        this.enterCage = false;
        this.leaveCage = false;
    };
    	
    Enemy.prototype = Object.create(Phaser.Sprite.prototype);
    Enemy.prototype.constructor = Enemy;
    
    Enemy.prototype.update = function() {
        this.game.physics.arcade.collide(this, this.game.floors, this.moveOrLeave, null, this);
        this.game.physics.arcade.collide(this, this.game.cages, this.lift, null, this);
        this.body.velocity.x = this.xSpeed;
    };
    
    Enemy.prototype.moveOnPlatform = function (enemy, platform) {
        if (this.game.reachingEdge(enemy, platform)) {
            enemy.xSpeed *= -1;
        }
    };
    
    Enemy.prototype.moveOrLeave = function (enemy, platform) {
        
        if (!this.game.reachingEdge(enemy, platform)
            || !this.game.maybeEnterCage(enemy, platform)) {
            this.moveOnPlatform(enemy, platform);
        };
        
    };
    
    Enemy.prototype.lift = function (enemy, platform) {
        
        if ( platform.lockedPlayers.indexOf(enemy) === -1 && enemy.body.velocity.y > 0 ) {
            platform.lockedPlayers.push(enemy);
            
            enemy.enterCage = false;
            enemy.lockedTo = platform;
        }
        
        this.moveOnPlatform(enemy, platform);
        
        
    };
    
    Enemy.prototype.checkLock = function (player) {
    };

    game.state.add('Game', PhaserGame, true);
