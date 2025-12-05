<script setup lang="ts">
import { publishArticle } from '~/composables/publish'

const { t } = useI18n()

// Form state
const title = ref('')
const summary = ref('')
const category = ref('')
const categoryId = ref<bigint>(0n)
const author = ref('')
const content = ref('')
const postscript = ref('')
const coverImageFile = ref<File | null>(null)
const coverImagePreview = ref<string | null>(null)
const royaltyBps = ref<bigint>(500n)

// Submit state
const isSubmitting = ref(false)
const submitStatus = ref<
  'idle' | 'validating' | 'uploadingCover' | 'uploadingArticle' | 'publishingContract' | 'success' | 'error'
>('idle')
const statusMessage = ref('')

// Handle cover image selection
function handleCoverImageChange(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  // Validate file type
  if (!file.type.startsWith('image/')) {
    statusMessage.value = t('invalid_image')
    submitStatus.value = 'error'
    return
  }

  // Validate file size (10MB max)
  if (file.size > 10 * 1024 * 1024) {
    statusMessage.value = t('image_too_large')
    submitStatus.value = 'error'
    return
  }

  coverImageFile.value = file
  coverImagePreview.value = URL.createObjectURL(file)
  submitStatus.value = 'idle'
}

// Remove cover image
function removeCoverImage() {
  if (coverImagePreview.value) {
    URL.revokeObjectURL(coverImagePreview.value)
  }
  coverImageFile.value = null
  coverImagePreview.value = null
}

// Reset form
function resetForm() {
  title.value = ''
  summary.value = ''
  category.value = ''
  categoryId.value = 0n
  author.value = ''
  content.value = ''
  postscript.value = ''
  removeCoverImage()
  royaltyBps.value = 500n
  isSubmitting.value = false
  submitStatus.value = 'idle'
  statusMessage.value = ''
}

// Handle category ID input
function handleCategoryIdChange(e: Event) {
  const target = e.target as HTMLInputElement
  categoryId.value = BigInt(target.value || '0')
}

// Handle royalty input
function handleRoyaltyChange(e: Event) {
  const target = e.target as HTMLInputElement
  royaltyBps.value = BigInt(Math.min(10000, Math.max(0, Number(target.value) || 0)))
}

// Computed royalty percentage display
const royaltyPercentage = computed(() => (Number(royaltyBps.value) / 100).toFixed(2))

// Handle form submission
async function handleSubmit() {
  if (isSubmitting.value) return

  try {
    isSubmitting.value = true
    submitStatus.value = 'validating'
    statusMessage.value = t('validating')

    // Validation
    if (!title.value.trim()) {
      throw new Error(t('field_required', { field: t('title') }))
    }
    if (!summary.value.trim()) {
      throw new Error(t('field_required', { field: t('summary') }))
    }
    if (!content.value.trim()) {
      throw new Error(t('field_required', { field: t('content_markdown') }))
    }
    if (categoryId.value < 0n) {
      throw new Error(t('invalid_category'))
    }
    if (royaltyBps.value < 0n || royaltyBps.value > 10000n) {
      throw new Error(t('invalid_royalty'))
    }

    // Parse tags from category field
    const tags = category.value
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)

    // Combine content with postscript if provided
    const fullContent = postscript.value.trim()
      ? `${content.value.trim()}\n\n---\n\n${postscript.value.trim()}`
      : content.value.trim()

    // Update status for cover upload
    if (coverImageFile.value) {
      submitStatus.value = 'uploadingCover'
      statusMessage.value = t('uploading_cover')
    }

    // Update status for article upload
    submitStatus.value = 'uploadingArticle'
    statusMessage.value = t('uploading_to_arweave')

    // Call publishArticle from composables
    const result = await publishArticle({
      title: title.value.trim(),
      summary: summary.value.trim(),
      content: fullContent,
      tags,
      coverImage: coverImageFile.value,
      categoryId: categoryId.value,
      royaltyBps: royaltyBps.value,
      originalAuthor: author.value.trim() || undefined
    })

    // Success
    submitStatus.value = 'success'
    statusMessage.value = t('publish_success', { arweaveId: result.arweaveId, txHash: result.txHash })
  } catch (error) {
    submitStatus.value = 'error'
    const errorMessage = error instanceof Error ? error.message : String(error)
    statusMessage.value = t('publish_failed', { error: errorMessage })
  } finally {
    isSubmitting.value = false
  }
}

// Button text based on submit status
const submitButtonText = computed(() => {
  if (!isSubmitting.value) return t('publish_article')
  switch (submitStatus.value) {
    case 'uploadingCover':
      return t('uploading_cover')
    case 'uploadingArticle':
      return t('uploading_to_arweave')
    case 'publishingContract':
      return t('publishing_to_blockchain')
    default:
      return t('publish_article')
  }
})

// Status message styling
const statusClass = computed(() => {
  switch (submitStatus.value) {
    case 'success':
      return 'border border-green-200 bg-green-50 text-green-800'
    case 'error':
      return 'border border-red-200 bg-red-50 text-red-800'
    default:
      return 'border border-blue-200 bg-blue-50 text-blue-800'
  }
})
</script>

<template>
  <div class="min-h-screen bg-white">
    <div class="mx-auto max-w-3xl px-6 py-12">
      <header class="mb-12">
        <h1 class="mb-2 text-4xl font-light tracking-tight">{{ $t('publish_article') }}</h1>
        <p class="text-gray-500">{{ $t('share_thoughts') }}</p>
      </header>

      <form @submit.prevent="handleSubmit" class="space-y-8">
        <!-- Title -->
        <div>
          <label for="title" class="mb-2 block text-sm font-medium text-gray-700">
            {{ $t('title') }} *
          </label>
          <input
            id="title"
            v-model="title"
            type="text"
            :placeholder="$t('enter_title')"
            class="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 placeholder-gray-400 transition-colors focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
            :disabled="isSubmitting"
          />
        </div>

        <!-- Summary -->
        <div>
          <label for="summary" class="mb-2 block text-sm font-medium text-gray-700">
            {{ $t('summary') }} *
          </label>
          <input
            id="summary"
            v-model="summary"
            type="text"
            :placeholder="$t('describe_content')"
            class="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 placeholder-gray-400 transition-colors focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
            :disabled="isSubmitting"
          />
        </div>

        <!-- Category -->
        <div>
          <label for="category" class="mb-2 block text-sm font-medium text-gray-700">
            {{ $t('category_comma_separated') }}
          </label>
          <input
            id="category"
            v-model="category"
            type="text"
            :placeholder="$t('category_example')"
            class="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 placeholder-gray-400 transition-colors focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
            :disabled="isSubmitting"
          />
        </div>

        <!-- Category ID -->
        <div>
          <label for="categoryId" class="mb-2 block text-sm font-medium text-gray-700">
            {{ $t('category_id_contract') }} *
          </label>
          <input
            id="categoryId"
            type="number"
            :value="Number(categoryId)"
            placeholder="0"
            min="0"
            class="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 placeholder-gray-400 transition-colors focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
            :disabled="isSubmitting"
            @change="handleCategoryIdChange"
          />
          <p class="mt-1 text-xs text-gray-500">{{ $t('category_id_help') }}</p>
        </div>

        <!-- Author -->
        <div>
          <label for="author" class="mb-2 block text-sm font-medium text-gray-700">
            {{ $t('author') }}
          </label>
          <input
            id="author"
            v-model="author"
            type="text"
            :placeholder="$t('author_placeholder')"
            class="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 placeholder-gray-400 transition-colors focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
            :disabled="isSubmitting"
          />
          <p class="mt-1 text-xs text-gray-500">{{ $t('author_help') }}</p>
        </div>

        <!-- Royalty -->
        <div>
          <label for="royalty" class="mb-2 block text-sm font-medium text-gray-700">
            {{ $t('royalty_percentage') }} *
          </label>
          <div class="flex items-center gap-3">
            <input
              id="royalty"
              type="number"
              :value="Number(royaltyBps)"
              placeholder="500"
              min="0"
              max="10000"
              class="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 placeholder-gray-400 transition-colors focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
              :disabled="isSubmitting"
              @change="handleRoyaltyChange"
            />
            <span class="whitespace-nowrap text-sm text-gray-600">({{ royaltyPercentage }}%)</span>
          </div>
          <p class="mt-1 text-xs text-gray-500">{{ $t('royalty_help') }}</p>
        </div>

        <!-- Cover Image -->
        <div>
          <label for="cover-image" class="mb-3 block text-sm font-medium text-gray-700">
            {{ $t('cover_image') }}
          </label>
          <template v-if="coverImagePreview">
            <div class="space-y-3">
              <div class="relative overflow-hidden rounded-lg bg-gray-100">
                <img :src="coverImagePreview" alt="Cover preview" class="h-64 w-full object-cover" />
              </div>
              <button
                type="button"
                class="text-sm text-gray-600 underline hover:text-gray-900"
                :disabled="isSubmitting"
                @click="removeCoverImage"
              >
                {{ $t('remove_image') }}
              </button>
            </div>
          </template>
          <template v-else>
            <label
              for="cover-image"
              class="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 px-6 py-10 transition-colors hover:border-gray-300"
            >
              <svg class="mb-2 h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              <p class="text-sm font-medium text-gray-700">{{ $t('upload_cover') }}</p>
              <p class="text-xs text-gray-500">{{ $t('image_format_help') }}</p>
              <input
                id="cover-image"
                type="file"
                accept="image/*"
                class="hidden"
                :disabled="isSubmitting"
                @change="handleCoverImageChange"
              />
            </label>
          </template>
        </div>

        <!-- Content -->
        <div>
          <label for="content" class="mb-2 block text-sm font-medium text-gray-700">
            {{ $t('content_markdown') }} *
          </label>
          <textarea
            id="content"
            v-model="content"
            :placeholder="$t('write_content')"
            :rows="12"
            class="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 font-mono text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
            :disabled="isSubmitting"
          />
        </div>

        <!-- Postscript -->
        <div>
          <label for="postscript" class="mb-2 block text-sm font-medium text-gray-700">
            {{ $t('postscript') }}
          </label>
          <textarea
            id="postscript"
            v-model="postscript"
            :placeholder="$t('postscript_placeholder')"
            :rows="4"
            class="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 placeholder-gray-400 transition-colors focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
            :disabled="isSubmitting"
          />
        </div>

        <!-- Status Message -->
        <div
          v-if="submitStatus !== 'idle'"
          :class="['whitespace-pre-wrap rounded-lg px-4 py-3 text-sm', statusClass]"
        >
          {{ statusMessage }}
        </div>

        <!-- Buttons -->
        <div class="flex gap-3">
          <button
            type="submit"
            :disabled="isSubmitting"
            class="flex-1 rounded-lg bg-gray-900 px-6 py-3 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {{ submitButtonText }}
          </button>
          <button
            type="button"
            :disabled="isSubmitting"
            class="rounded-lg border border-gray-200 px-6 py-3 font-medium text-gray-900 transition-colors hover:bg-gray-50 disabled:opacity-50"
            @click="resetForm"
          >
            {{ $t('clear') }}
          </button>
        </div>

        <p class="text-xs text-gray-500">{{ $t('required_fields') }}</p>
      </form>
    </div>
  </div>
</template>
