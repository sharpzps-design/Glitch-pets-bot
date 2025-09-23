const { pool } = require('./src/db');

// check every 30s for due eggs
const TICK_MS = 30 * 1000;

function initHatcher(bot) {
  async function tick() {
    try {
      // claim due eggs by marking them HATCHING to avoid double-send on parallel ticks
      const { rows } = await pool.query(
        `UPDATE eggs
           SET status = 'HATCHING'
         WHERE id IN (
           SELECT id FROM eggs
            WHERE status = 'PENDING' AND hatch_at <= NOW()
            FOR UPDATE SKIP LOCKED
         )
         RETURNING id, user_id, species;`
      );

      for (const egg of rows) {
        try {
          await bot.sendMessage(egg.user_id, `🎉 Your ${egg.species} hatched!`);
          await pool.query('UPDATE eggs SET status = $1 WHERE id = $2', ['HATCHED', egg.id]);
        } catch (e) {
          console.error('Failed to send hatch message', e);
          // If failed to send, set back to PENDING to retry later
          await pool.query('UPDATE eggs SET status = $1 WHERE id = $2', ['PENDING', egg.id]);
        }
      }
    } catch (e) {
      console.error('hatcher tick error', e);
    } finally {
      setTimeout(tick, TICK_MS);
    }
  }

  setTimeout(tick, TICK_MS);
  console.log('Hatcher loop running.');
}

async function scheduleEgg({ userId, species, hatchAt }) {
  await pool.query(
    'INSERT INTO eggs (user_id, species, hatch_at) VALUES ($1, $2, $3)',
    [userId, species, hatchAt]
  );
}

module.exports = { initHatcher, scheduleEgg };
