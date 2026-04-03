<script>
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { api } from '$lib/api';

	let email = $state('');
	let password = $state('');
	let jmeno = $state('');
	let nacitani = $state(false);
	let chyba = $state('');
	let info = $state('');
	let jeRegistrace = $state(false);
	/** @type {HTMLCanvasElement | null} */
	let ambientCanvas = null;

	onMount(() => {
		let raf = 0;
		const canvas = ambientCanvas;
		const ctx = canvas?.getContext('2d');

		if (canvas && ctx) {
			const particleCount = 260;
			const propCount = 10;
			const props = new Float32Array(particleCount * propCount);
			const offscreen = document.createElement('canvas');
			const offCtx = offscreen.getContext('2d');
			if (!offCtx) return;

			let width = window.innerWidth;
			let height = window.innerHeight;
			let centerX = width / 2;
			let centerY = height / 2;

			const randomEdgePoint = () => {
				const side = Math.floor(Math.random() * 4);
				if (side === 0) return [Math.random() * width, -20];
				if (side === 1) return [width + 20, Math.random() * height];
				if (side === 2) return [Math.random() * width, height + 20];
				return [-20, Math.random() * height];
			};

			/** @param {number} offset */
			const seedParticle = (offset) => {
				const [x, y] = randomEdgePoint();
				const toCenter = Math.atan2(centerY - y, centerX - x);
				const spin = (Math.random() > 0.5 ? 1 : -1) * (0.35 + Math.random() * 0.22);
				const direction = toCenter;
				const speed = 2.7 + Math.random() * 1.7;
				const size = 2 + Math.random() * 3.4;
				const hue = 4 + Math.random() * 18;

				props[offset] = x;
				props[offset + 1] = y;
				props[offset + 2] = Math.cos(direction) * speed;
				props[offset + 3] = Math.sin(direction) * speed;
				props[offset + 4] = direction;
				props[offset + 5] = spin;
				props[offset + 6] = size;
				props[offset + 7] = hue;
				props[offset + 8] = speed;
				props[offset + 9] = 0;
			};

			const seedAll = () => {
				for (let i = 0; i < props.length; i += propCount) {
					seedParticle(i);
				}
			};

			const resize = () => {
				const dpr = Math.min(window.devicePixelRatio || 1, 2);
				width = window.innerWidth;
				height = window.innerHeight;
				centerX = width / 2;
				centerY = height / 2;

				canvas.width = Math.floor(width * dpr);
				canvas.height = Math.floor(height * dpr);
				canvas.style.width = `${width}px`;
				canvas.style.height = `${height}px`;
				ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

				offscreen.width = Math.floor(width * dpr);
				offscreen.height = Math.floor(height * dpr);
				offCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
			};

			const updateParticles = () => {
				/** @param {number} from @param {number} to */
				const shortestAngleDelta = (from, to) => {
					let delta = to - from;
					if (delta > Math.PI) delta -= Math.PI * 2;
					if (delta < -Math.PI) delta += Math.PI * 2;
					return delta;
				};

				for (let i = 0; i < props.length; i += propCount) {
					let x = props[i];
					let y = props[i + 1];
					let direction = props[i + 4];
					const spin = props[i + 5];
					let speed = props[i + 8];
					let progress = props[i + 9];

					const toCenter = Math.atan2(centerY - y, centerX - x);
					progress = Math.min(1, progress + 0.011);
					const targetDirection = toCenter + spin * progress;
					direction += shortestAngleDelta(direction, targetDirection) * 0.13;
					speed *= 0.992 - progress * 0.002;
					if (speed < 0.52) speed = 0.52;

					const vx = Math.cos(direction) * speed;
					const vy = Math.sin(direction) * speed;
					x += vx;
					y += vy;

					props[i] = x;
					props[i + 1] = y;
					props[i + 2] = vx;
					props[i + 3] = vy;
					props[i + 4] = direction;
					props[i + 8] = speed;
					props[i + 9] = progress;

					const dx = centerX - x;
					const dy = centerY - y;
					const nearCenter = dx * dx + dy * dy < 16 * 16;
					const outOfBounds = x < -40 || x > width + 40 || y < -40 || y > height + 40;

					if (nearCenter || outOfBounds) {
						seedParticle(i);
					}
				}
			};

			const drawOffscreen = () => {
				offCtx.globalCompositeOperation = 'source-over';
				offCtx.fillStyle = 'rgba(5, 5, 7, 0.16)';
				offCtx.fillRect(0, 0, width, height);
				offCtx.globalCompositeOperation = 'lighter';

				for (let i = 0; i < props.length; i += propCount) {
					const x = props[i];
					const y = props[i + 1];
					const direction = props[i + 4];
					const size = props[i + 6];
					const hue = props[i + 7];

					offCtx.save();
					offCtx.translate(x, y);
					offCtx.rotate(direction);
					offCtx.fillStyle = `hsla(${hue}, 100%, 58%, 0.46)`;
					offCtx.fillRect(-size / 2, -size / 2, size, size * 1.35);
					offCtx.restore();
				}
			};

			const render = () => {
				ctx.globalCompositeOperation = 'source-over';
				ctx.fillStyle = '#050507';
				ctx.fillRect(0, 0, width, height);
				ctx.drawImage(offscreen, 0, 0, width, height);
			};

			const frame = () => {
				updateParticles();
				drawOffscreen();
				render();
				raf = requestAnimationFrame(frame);
			};

			resize();
			seedAll();
			window.addEventListener('resize', resize);
			raf = requestAnimationFrame(frame);

			void (async () => {
				try {
					await api.profile();
					goto('/dashboard');
				} catch {}
			})();

			return () => {
				cancelAnimationFrame(raf);
				window.removeEventListener('resize', resize);
			};
		}

		void (async () => {
			try {
				await api.profile();
				goto('/dashboard');
			} catch {}
		})();
	});

	/** @param {SubmitEvent} event */
	async function odeslatFormular(event) {
		event.preventDefault();
		chyba = '';
		info = '';
		nacitani = true;

		try {
			if (jeRegistrace) {
				await api.signup(email, password, jmeno || undefined);
				info = 'Registrace proběhla. Teď tě přihlašuji...';
			}

			await api.login(email, password);
			goto('/dashboard');
		} catch (error) {
			chyba = error instanceof Error ? error.message : 'Nastala neočekávaná chyba';
		} finally {
			nacitani = false;
		}
	}
</script>

<svelte:head>
	<title>Přihlášení | Notes</title>
</svelte:head>

<div class="stranka">
	<canvas bind:this={ambientCanvas} class="ambient-canvas" aria-hidden="true"></canvas>
	<div class="prekryv"></div>

	<section class="karta">
		<header class="hlavicka">
			<div>
				<h1>Notes</h1>
				<p>{jeRegistrace ? 'Vytvoř si účet pro své poznámky' : 'Přihlas se ke svým poznámkám'}</p>
			</div>
		</header>

		<form onsubmit={odeslatFormular} class="formular">
			{#if jeRegistrace}
				<label>
					<span>Uživatelské jméno (volitelné)</span>
					<input bind:value={jmeno} type="text" placeholder="Např. Mulle" maxlength="150" />
				</label>
			{/if}

			<label>
				<span>E-mail</span>
				<input bind:value={email} type="email" required placeholder="Zadej e-mail" autocomplete="email" />
			</label>

			<label>
				<span>Heslo</span>
				<input
					bind:value={password}
					type="password"
					required
					minlength="8"
					placeholder="Zadej heslo"
					autocomplete={jeRegistrace ? 'new-password' : 'current-password'}
				/>
			</label>

			{#if chyba}
				<p class="zprava chyba">{chyba}</p>
			{/if}
			{#if info}
				<p class="zprava info">{info}</p>
			{/if}

			<button disabled={nacitani} type="submit">
				{#if nacitani}
					Probíhá...
				{:else if jeRegistrace}
					Registrovat a přihlásit
				{:else}
					Přihlásit se
				{/if}
			</button>
		</form>

		<button class="prepinac" type="button" onclick={() => (jeRegistrace = !jeRegistrace)}>
			{#if jeRegistrace}
				Máš účet? Přepnout na přihlášení
			{:else}
				Nemáš účet? Přepnout na registraci
			{/if}
		</button>

		<p class="bezpecnost">🔒 Zabezpečeno přes JWT</p>
	</section>
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		background: #050507;
		overflow-x: hidden;
	}

	.stranka {
		min-height: 100vh;
		width: 100vw;
		display: grid;
		place-items: center;
		padding: 1rem;
		position: relative;
		background:
			radial-gradient(circle at 50% 18%, rgba(255, 49, 31, 0.16), transparent 24%),
			radial-gradient(circle at 24% 26%, rgba(255, 49, 31, 0.08), transparent 18%),
			#050507;
	}

	.ambient-canvas {
		position: fixed;
		inset: 0;
		width: 100%;
		height: 100%;
		display: block;
		pointer-events: none;
		z-index: 0;
		opacity: 1;
	}

	.prekryv {
		position: fixed;
		inset: 0;
		z-index: 1;
		pointer-events: none;
		background:
			radial-gradient(circle at center, transparent 0%, rgba(5, 5, 7, 0.14) 100%),
			radial-gradient(circle at 50% 22%, rgba(255, 49, 31, 0.16) 0%, transparent 58%);
	}

	.karta {
		position: relative;
		z-index: 2;
		width: min(420px, 100%);
		padding: 2.5rem;
		border-radius: 28px;
		background: rgba(14, 14, 18, 0.78);
		border: 1px solid rgba(255, 49, 31, 0.18);
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
		color: #eef2f7;
	}

	.hlavicka {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 0.75rem;
		margin-bottom: 1.2rem;
	}

	h1 {
		font-size: 2rem;
		font-weight: 600;
		margin: 0;
		color: #f8fafc;
	}

	.hlavicka p {
		margin-top: 0.45rem;
		margin-bottom: 0;
		color: #b8c1cf;
	}

	.formular {
		display: grid;
		gap: 1rem;
	}

	label {
		display: grid;
		gap: 0.4rem;
	}

	span {
		font-size: 0.92rem;
		color: #cad4e2;
		font-weight: 600;
	}

	input {
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(8, 8, 11, 0.84);
		color: #eef2f7;
		padding: 0.72rem 0.85rem;
		border-radius: 14px;
		outline: none;
		transition: border-color 180ms ease, box-shadow 180ms ease;
	}

	input:focus {
		border-color: rgba(255, 49, 31, 0.92);
		box-shadow: 0 0 0 3px rgba(255, 49, 31, 0.18);
	}

	button[type='submit'] {
		margin-top: 0.2rem;
		background: linear-gradient(180deg, #ff311f, #c81f12);
		color: white;
		padding: 0.8rem 1rem;
		border-radius: 14px;
		font-weight: 700;
		border: none;
		cursor: pointer;
		box-shadow: 0 16px 34px rgba(255, 49, 31, 0.24);
		transition: transform 140ms ease, opacity 130ms ease;
	}

	button[type='submit']:hover:not(:disabled) {
		transform: translateY(-1px);
	}

	button[type='submit']:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.prepinac {
		margin-top: 1rem;
		width: 100%;
		border: none;
		background: transparent;
		color: #ff8d82;
		cursor: pointer;
		font-size: 0.95rem;
		font-weight: 600;
	}

	.zprava {
		padding: 0.65rem 0.8rem;
		border-radius: 12px;
		font-size: 0.92rem;
	}

	.chyba {
		background: rgba(114, 23, 22, 0.76);
		border: 1px solid rgba(255, 49, 31, 0.26);
		color: #ffb9b9;
	}

	.info {
		background: rgba(16, 56, 34, 0.72);
		border: 1px solid rgba(86, 220, 136, 0.22);
		color: #b5ffd0;
	}

	.bezpecnost {
		margin-top: 1rem;
		text-align: center;
		font-size: 0.78rem;
		color: #8d9ab0;
	}

	@media (max-width: 640px) {
		.karta {
			padding: 1.25rem;
			border-radius: 18px;
		}

		h1 {
			font-size: 1.65rem;
		}
	}
</style>
