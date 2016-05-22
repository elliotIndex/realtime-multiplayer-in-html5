'use strict';

const TimedEvent = require('./TimedEvent');
const BulletEvent = require('./BulletEvent');
const Bullet = require('../Bullet');

function PlayerEventHandler ({ eventSystem, bullets }) {
    function reload (eventData, player) {
        const { id, name } = eventData;

        eventSystem.dispatch(TimedEvent.create({
            id,
            name,
            firedBy: player,
            duration: 500,
            onDispatch: () => {
                player.setReloading(true);
            },
            onDone: () => {
                player.setReloading(false);
            }
        }));
    }

    function fire (eventData, player) {
        const { id, name } = eventData;
        const bullet = Bullet.create({
            firedBy: player
        });

        eventSystem.dispatch(BulletEvent.create({
            id,
            name,
            bullet,
            firedBy: player,
            onDispatch: () => {
                bullets.add(bullet);
                player.fireBullet();
            },
            onDone: () => {
                bullets.delete(bullet);
            }
        }));
    }

    function onNetworkEvent (eventData, player) {
        if (eventData.name === 'reload') {
            reload(eventData, player);
        }

        if (eventData.name === 'bulletEvent') {
            fire(eventData, player);
        }
    }

    function onEvent (eventData, player) {
        if (eventData.name === 'reload' && !player.isReloading()) {
            reload(eventData, player);
        }

        if (eventData.name === 'bulletEvent' && player.canFire()) {
            fire(eventData, player);
        }
    }

    return Object.freeze({
        onEvent,
        onNetworkEvent
    });
}

module.exports = { create: PlayerEventHandler };
