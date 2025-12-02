<script lang="ts">
	import { publishArticle } from '$lib/publish'
	import * as m from '$lib/paraglide/messages'

	let title = $state('')
	let summary = $state('')
	let category = $state('')
	let categoryId = $state<bigint>(0n)
	let author = $state('')
	let content = $state('')
	let postscript = $state('')
	let coverImageFile: File | null = $state(null)
	let coverImagePreview = $state<string | null>(null)
	let royaltyBps = $state<bigint>(500n)

	let isSubmitting = $state(false)
	let submitStatus = $state<'idle' | 'validating' | 'uploadingCover' | 'uploadingArticle' | 'publishingContract' | 'success' | 'error'>('idle')
	let statusMessage = $state('')
	let arweaveId = $state('')
	let txHash = $state('')

	function handleCoverImageChange(e: Event) {
		const input = e.target as HTMLInputElement
		const file = input.files?.[0]

		if (file) {
			if (!file.type.startsWith('image/')) {
				statusMessage = m.publish.error_image_invalid()
				submitStatus = 'error'
				return
			}

			if (file.size > 10 * 1024 * 1024) {
				statusMessage = m.publish.error_image_too_large()
				submitStatus = 'error'
				return
			}

			coverImageFile = file
			const reader = new FileReader()
			reader.onload = (event) => {
				coverImagePreview = event.target?.result as string
			}
			reader.readAsDataURL(file)
		}
	}

	function removeCoverImage() {
		coverImageFile = null
		coverImagePreview = null
	}

	function resetForm() {
		title = ''
		summary = ''
		category = ''
		categoryId = 0n
		author = ''
		content = ''
		postscript = ''
		coverImageFile = null
		coverImagePreview = null
		royaltyBps = 500n
		submitStatus = 'idle'
		statusMessage = ''
		arweaveId = ''
		txHash = ''
	}

	async function handleSubmit() {
		submitStatus = 'validating'
		statusMessage = m.publish.status_validating()

		const tags = category ? category.split(',').map((t) => t.trim()).filter(Boolean) : []

		try {
			// Validate inputs
			if (!title.trim()) {
				throw new Error(m.publish.error_title_required())
			}
			if (!summary.trim()) {
				throw new Error(m.publish.error_summary_required())
			}
			if (!content.trim()) {
				throw new Error(m.publish.error_content_required())
			}
			if (categoryId < 0n) {
				throw new Error(m.publish.error_category_invalid())
			}
			if (royaltyBps < 0n || royaltyBps > 10000n) {
				throw new Error(m.publish.error_royalty_invalid())
			}

			isSubmitting = true

			// Upload cover image if provided
			if (coverImageFile) {
				submitStatus = 'uploadingCover'
				statusMessage = m.publish.status_uploading_cover()
			}

			// Upload article to Arweave
			submitStatus = 'uploadingArticle'
			statusMessage = m.publish.status_uploading_article()

			// Publish to contract
			submitStatus = 'publishingContract'
			statusMessage = m.publish.status_publishing()

			// Call the unified publish function
			const result = await publishArticle({
				title: title.trim(),
				summary: summary.trim(),
				content: content.trim(),
				tags,
				coverImage: coverImageFile,
				categoryId,
				royaltyBps,
				originalAuthor: author.trim()
			})

			arweaveId = result.arweaveId
			txHash = result.txHash

			submitStatus = 'success'
			statusMessage = m.publish.status_success({ arweaveId: result.arweaveId, txHash: result.txHash })

			// Reset form after success
			setTimeout(() => {
				resetForm()
			}, 3000)
		} catch (error) {
			console.error('Publish error:', error)
			submitStatus = 'error'
			const errorMessage = error instanceof Error ? error.message : 'Unknown error'
			statusMessage = m.publish.error_publish({ error: errorMessage })
		} finally {
			isSubmitting = false
		}
	}
</script>

<div class="min-h-screen bg-white">
	<div class="mx-auto max-w-3xl px-6 py-12">
		<header class="mb-12">
			<h1 class="mb-2 text-4xl font-light tracking-tight">{m.publish.title()}</h1>
			<p class="text-gray-500">{m.publish.subtitle()}</p>
		</header>

		<form
			onsubmit={(e) => {
				e.preventDefault()
				handleSubmit()
			}}
			class="space-y-8"
		>
			<div>
				<label for="title" class="mb-2 block text-sm font-medium text-gray-700">
					{m.publish.field_title()} *
				</label>
				<input
					id="title"
					type="text"
					bind:value={title}
					placeholder={m.publish.field_title_placeholder()}
					class="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 placeholder-gray-400 transition-colors focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
					disabled={isSubmitting}
				/>
			</div>

			<div>
				<label for="summary" class="mb-2 block text-sm font-medium text-gray-700">
					{m.publish.field_summary()} *
				</label>
				<input
					id="summary"
					type="text"
					bind:value={summary}
					placeholder={m.publish.field_summary_placeholder()}
					class="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 placeholder-gray-400 transition-colors focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
					disabled={isSubmitting}
				/>
			</div>

			<div>
				<label for="category" class="mb-2 block text-sm font-medium text-gray-700">
					{m.publish.field_category()}
				</label>
				<input
					id="category"
					type="text"
					bind:value={category}
					placeholder={m.publish.field_category_placeholder()}
					class="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 placeholder-gray-400 transition-colors focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
					disabled={isSubmitting}
				/>
			</div>

			<div>
				<label for="categoryId" class="mb-2 block text-sm font-medium text-gray-700">
					{m.publish.field_category_id()} *
				</label>
				<input
					id="categoryId"
					type="number"
					bind:value={categoryId}
					placeholder={m.publish.field_category_id_placeholder()}
					min="0"
					class="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 placeholder-gray-400 transition-colors focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
					disabled={isSubmitting}
					onchange={(e) => {
						const target = e.target as HTMLInputElement
						categoryId = BigInt(target.value || '0')
					}}
				/>
				<p class="mt-1 text-xs text-gray-500">{m.publish.field_category_id_help()}</p>
			</div>

			<div>
				<label for="author" class="mb-2 block text-sm font-medium text-gray-700">
					{m.publish.field_author()}
				</label>
				<input
					id="author"
					type="text"
					bind:value={author}
					placeholder={m.publish.field_author_placeholder()}
					class="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 placeholder-gray-400 transition-colors focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
					disabled={isSubmitting}
				/>
				<p class="mt-1 text-xs text-gray-500">{m.publish.field_author_help()}</p>
			</div>

			<div>
				<label for="royalty" class="mb-2 block text-sm font-medium text-gray-700">
					{m.publish.field_royalty()} *
				</label>
				<div class="flex items-center gap-3">
					<input
						id="royalty"
						type="number"
						bind:value={royaltyBps}
						placeholder="500"
						min="0"
						max="10000"
						class="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 placeholder-gray-400 transition-colors focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
						disabled={isSubmitting}
						onchange={(e) => {
							const target = e.target as HTMLInputElement
							royaltyBps = BigInt(Math.min(10000, Math.max(0, Number(target.value) || 0)))
						}}
					/>
					<span class="text-sm text-gray-600 whitespace-nowrap">({(Number(royaltyBps) / 100).toFixed(2)}%)</span>
				</div>
				<p class="mt-1 text-xs text-gray-500">{m.publish.field_royalty_help()}</p>
			</div>

			<div>
				<label for="cover-image" class="mb-3 block text-sm font-medium text-gray-700">
					{m.publish.field_cover_image()}
				</label>
				{#if coverImagePreview}
					<div class="space-y-3">
						<div class="relative overflow-hidden rounded-lg bg-gray-100">
							<img src={coverImagePreview} alt="Cover preview" class="h-64 w-full object-cover" />
						</div>
						<button
							type="button"
							onclick={removeCoverImage}
							class="text-sm text-gray-600 underline hover:text-gray-900"
							disabled={isSubmitting}
						>
							{m.publish.field_cover_image_remove()}
						</button>
					</div>
				{:else}
					<label
						for="cover-image"
						class="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 px-6 py-10 transition-colors hover:border-gray-300"
					>
						<svg class="mb-2 h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
						</svg>
						<p class="text-sm font-medium text-gray-700">{m.publish.field_cover_image_upload()}</p>
						<p class="text-xs text-gray-500">{m.publish.field_cover_image_help()}</p>
						<input
							id="cover-image"
							type="file"
							accept="image/*"
							onchange={handleCoverImageChange}
							class="hidden"
							disabled={isSubmitting}
						/>
					</label>
				{/if}
			</div>

			<div>
				<label for="content" class="mb-2 block text-sm font-medium text-gray-700">
					{m.publish.field_content()} *
				</label>
				<textarea
					id="content"
					bind:value={content}
					placeholder={m.publish.field_content_placeholder()}
					rows={12}
					class="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 font-mono text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
					disabled={isSubmitting}
				></textarea>
			</div>

			<div>
				<label for="postscript" class="mb-2 block text-sm font-medium text-gray-700">
					{m.publish.field_postscript()}
				</label>
				<textarea
					id="postscript"
					bind:value={postscript}
					placeholder={m.publish.field_postscript_placeholder()}
					rows={4}
					class="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 placeholder-gray-400 transition-colors focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
					disabled={isSubmitting}
				></textarea>
			</div>

			{#if submitStatus !== 'idle'}
				<div
					class={`whitespace-pre-wrap rounded-lg px-4 py-3 text-sm ${
						submitStatus === 'success'
							? 'border border-green-200 bg-green-50 text-green-800'
							: submitStatus === 'error'
								? 'border border-red-200 bg-red-50 text-red-800'
								: 'border border-blue-200 bg-blue-50 text-blue-800'
					}`}
				>
					{statusMessage}
				</div>
			{/if}

			<div class="flex gap-3">
				<button
					type="submit"
					disabled={isSubmitting}
					class="flex-1 rounded-lg bg-gray-900 px-6 py-3 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
				>
					{#if isSubmitting}
						<span>
							{submitStatus === 'uploadingCover'
								? m.publish.status_uploading_cover()
								: submitStatus === 'uploadingArticle'
									? m.publish.status_uploading_article()
									: submitStatus === 'publishingContract'
										? m.publish.status_publishing()
										: m.publish.button_publish()}
						</span>
					{:else}
						<span>{m.publish.button_publish()}</span>
					{/if}
				</button>
				<button
					type="button"
					onclick={resetForm}
					disabled={isSubmitting}
					class="rounded-lg border border-gray-200 px-6 py-3 font-medium text-gray-900 transition-colors hover:bg-gray-50 disabled:opacity-50"
				>
					{m.publish.button_clear()}
				</button>
			</div>

			<p class="text-xs text-gray-500">{m.publish.required_fields()}</p>
		</form>
	</div>
</div>
