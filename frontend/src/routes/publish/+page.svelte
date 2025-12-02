<script lang="ts">
	import { publishArticle } from '$lib/publish'

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
				statusMessage = 'Please select a valid image file'
				submitStatus = 'error'
				return
			}

			if (file.size > 10 * 1024 * 1024) {
				statusMessage = 'Image must be smaller than 10MB'
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
		statusMessage = 'Validating article...'

		const tags = category ? category.split(',').map((t) => t.trim()).filter(Boolean) : []

		try {
			// Validate inputs
			if (!title.trim()) {
				throw new Error('Title is required')
			}
			if (!summary.trim()) {
				throw new Error('Summary is required')
			}
			if (!content.trim()) {
				throw new Error('Content is required')
			}
			if (categoryId < 0n) {
				throw new Error('Please select a valid category')
			}
			if (royaltyBps < 0n || royaltyBps > 10000n) {
				throw new Error('Royalty must be between 0-100%')
			}

			isSubmitting = true

			// Upload cover image if provided
			if (coverImageFile) {
				submitStatus = 'uploadingCover'
				statusMessage = 'Uploading cover image...'
			}

			// Upload article to Arweave
			submitStatus = 'uploadingArticle'
			statusMessage = 'Uploading article to Arweave...'

			// Publish to contract
			submitStatus = 'publishingContract'
			statusMessage = 'Publishing to blockchain...'

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
			statusMessage = `✨ Article published successfully!\n\nArweave: ${result.arweaveId}\nTransaction: ${result.txHash}`

			// Reset form after success
			setTimeout(() => {
				resetForm()
			}, 3000)
		} catch (error) {
			console.error('Publish error:', error)
			submitStatus = 'error'
			statusMessage = `Failed to publish: ${error instanceof Error ? error.message : 'Unknown error'}`
		} finally {
			isSubmitting = false
		}
	}
</script>

<div class="min-h-screen bg-white">
	<div class="mx-auto max-w-3xl px-6 py-12">
		<header class="mb-12">
			<h1 class="mb-2 text-4xl font-light tracking-tight">Publish Article</h1>
			<p class="text-gray-500">Share your thoughts with the world</p>
		</header>

		<form
			onsubmit={(e) => {
				e.preventDefault()
				handleSubmit()
			}}
			class="space-y-8"
		>
			<div>
				<label for="title" class="mb-2 block text-sm font-medium text-gray-700">Title *</label>
				<input
					id="title"
					type="text"
					bind:value={title}
					placeholder="Enter article title"
					class="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 placeholder-gray-400 transition-colors focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
					disabled={isSubmitting}
				/>
			</div>

			<div>
				<label for="summary" class="mb-2 block text-sm font-medium text-gray-700">Summary *</label>
				<input
					id="summary"
					type="text"
					bind:value={summary}
					placeholder="Brief summary of your article"
					class="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 placeholder-gray-400 transition-colors focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
					disabled={isSubmitting}
				/>
			</div>

			<div>
				<label for="category" class="mb-2 block text-sm font-medium text-gray-700">
					Category (comma-separated)
				</label>
				<input
					id="category"
					type="text"
					bind:value={category}
					placeholder="e.g. Technology, Design, Business"
					class="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 placeholder-gray-400 transition-colors focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
					disabled={isSubmitting}
				/>
			</div>

			<div>
				<label for="categoryId" class="mb-2 block text-sm font-medium text-gray-700">
					Category ID (Contract) *
				</label>
				<input
					id="categoryId"
					type="number"
					bind:value={categoryId}
					placeholder="0"
					min="0"
					class="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 placeholder-gray-400 transition-colors focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
					disabled={isSubmitting}
					onchange={(e) => {
						const target = e.target as HTMLInputElement
						categoryId = BigInt(target.value || '0')
					}}
				/>
				<p class="mt-1 text-xs text-gray-500">The numeric ID for this article's category on the blockchain</p>
			</div>

			<div>
				<label for="author" class="mb-2 block text-sm font-medium text-gray-700">Author</label>
				<input
					id="author"
					type="text"
					bind:value={author}
					placeholder="Your name or pen name (optional)"
					class="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 placeholder-gray-400 transition-colors focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
					disabled={isSubmitting}
				/>
				<p class="mt-1 text-xs text-gray-500">For repost scenarios; leave empty if you are the original author</p>
			</div>

			<div>
				<label for="royalty" class="mb-2 block text-sm font-medium text-gray-700">
					Royalty Percentage *
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
				<p class="mt-1 text-xs text-gray-500">Basis points (100 = 1%, max 10000 = 100%)</p>
			</div>

			<div>
				<label for="cover-image" class="mb-3 block text-sm font-medium text-gray-700">Cover Image</label>
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
							Remove image
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
						<p class="text-sm font-medium text-gray-700">Upload cover image</p>
						<p class="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
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
					Content (Markdown supported) *
				</label>
				<textarea
					id="content"
					bind:value={content}
					placeholder="Write your article content here..."
					rows={12}
					class="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 font-mono text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
					disabled={isSubmitting}
				></textarea>
			</div>

			<div>
				<label for="postscript" class="mb-2 block text-sm font-medium text-gray-700">Postscript</label>
				<textarea
					id="postscript"
					bind:value={postscript}
					placeholder="Optional postscript or footer note..."
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
								? 'Uploading Cover...'
								: submitStatus === 'uploadingArticle'
									? 'Uploading Article...'
									: submitStatus === 'publishingContract'
										? 'Publishing...'
										: 'Publishing...'}
						</span>
					{:else}
						<span>Publish Article</span>
					{/if}
				</button>
				<button
					type="button"
					onclick={resetForm}
					disabled={isSubmitting}
					class="rounded-lg border border-gray-200 px-6 py-3 font-medium text-gray-900 transition-colors hover:bg-gray-50 disabled:opacity-50"
				>
					Clear
				</button>
			</div>

			<p class="text-xs text-gray-500">* Required fields</p>
		</form>
	</div>
</div>
