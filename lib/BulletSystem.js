'use strict';

const fixedNumber = require('./fixed-number');
const uuid = require('node-uuid');

const BULLET_SPEED = 220;
const MAX_DISTANCE = 500;
const DELAY = 200;

function BulletSystem ({ onFire } = {}) {
    const activeBullets = new Map();
    const playerFires = new Map();

    function addBullet (firedBy, bulletData) {
        if (!activeBullets.has(bulletData.id)) {
            const bullet = {
                id: bulletData.id,
                firedBy,
                x: bulletData.x,
                y: bulletData.y,
                angle: bulletData.angle,
                distance: bulletData.distance,
                speed: bulletData.speed
            };

            activeBullets.set(bullet.id, bullet);
        }
    }

    function fireBullet (firedBy) {
        const delay = playerFires.get(firedBy);
        const canFire = delay ? delay <= 0 : true;

        if (canFire) {
            const { x, y } = firedBy.getPosition();
            const bullet = {
                id: uuid.v4(),
                firedBy,
                x,
                y,
                angle: Math.PI,
                distance: MAX_DISTANCE,
                speed: BULLET_SPEED
            };

            activeBullets.set(bullet.id, bullet);
            playerFires.set(firedBy, DELAY);

            if (typeof onFire === 'function') {
                onFire(bullet);
            }
        }
    }

    function update (delta) {
        for (const bullet of activeBullets.values()) {
            if (bullet.distance <= 0) {
                activeBullets.delete(bullet.id);
            } else {
                bullet.distance -= BULLET_SPEED * (delta / 1000);
                bullet.x += fixedNumber(bullet.speed * Math.cos(bullet.angle) * (delta / 1000), 3);
                bullet.y += fixedNumber(bullet.speed * Math.sin(bullet.angle) * (delta / 1000), 3);
            }
        }

        for (const fireEntries of playerFires) {
            const player = fireEntries[0];
            const delay = fireEntries[1];

            if (delay > 0) {
                playerFires.set(player, delay - delta);
            }
        }
    }

    function removePlayer (player) {
        playerFires.delete(player);
    }

    function getBullets () {
        return Array.from(activeBullets.values());
    }

    return Object.freeze({
        removePlayer,
        addBullet,
        fireBullet,
        update,
        getBullets
    });
}

module.exports = { create: BulletSystem };
