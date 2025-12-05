<script setup lang="ts">
export interface SelectOption {
  key: string | number
  label: string
  value: any
}

const props = withDefaults(
  defineProps<{
    modelValue: any
    options: SelectOption[]
    placeholder?: string
    disabled?: boolean
    noResultsText?: string
  }>(),
  {
    placeholder: '',
    disabled: false,
    noResultsText: 'No results'
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: any]
}>()

const searchQuery = ref('')
const showDropdown = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)

const filteredOptions = computed(() => {
  const search = searchQuery.value.toLowerCase()
  if (!search) return props.options
  return props.options.filter(
    (item) =>
      item.label.toLowerCase().includes(search) ||
      String(item.key).toLowerCase().includes(search)
  )
})

const selectedOption = computed(() => {
  return props.options.find((opt) => opt.value === props.modelValue)
})

const selectedLabel = computed(() => {
  return selectedOption.value?.label ?? ''
})

function selectOption(option: SelectOption) {
  emit('update:modelValue', option.value)
  searchQuery.value = ''
  showDropdown.value = false
}

function handleInputFocus() {
  showDropdown.value = true
}

function handleInputBlur() {
  setTimeout(() => {
    showDropdown.value = false
  }, 150)
}

function clearSelection() {
  emit('update:modelValue', null)
  searchQuery.value = ''
}

const hasSelection = computed(() => {
  return props.modelValue !== null && props.modelValue !== undefined && selectedOption.value !== undefined
})
</script>

<template>
  <div class="relative">
    <div class="relative">
      <input
        ref="inputRef"
        v-model="searchQuery"
        type="text"
        :placeholder="selectedLabel || placeholder"
        class="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 pr-10 text-base text-gray-900 placeholder-gray-400 transition-colors focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
        :disabled="disabled"
        @focus="handleInputFocus"
        @blur="handleInputBlur"
      />
      <div class="absolute inset-y-0 right-0 flex items-center pr-3">
        <button
          v-if="hasSelection"
          type="button"
          class="text-gray-400 hover:text-gray-600"
          @mousedown.prevent="clearSelection"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <svg v-else class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
    <!-- Selected display -->
    <div v-if="selectedLabel && !showDropdown" class="mt-2 flex items-center gap-2">
      <span class="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-800">
        {{ selectedLabel }}
        <button
          type="button"
          class="ml-1 text-gray-500 hover:text-gray-700"
          @click="clearSelection"
        >
          <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </span>
    </div>
    <!-- Dropdown -->
    <div
      v-if="showDropdown"
      class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg"
    >
      <!-- Clear option when has selection -->
      <div
        v-if="hasSelection"
        class="cursor-pointer border-b border-gray-100 px-4 py-2 text-sm text-gray-500 hover:bg-gray-100"
        @mousedown.prevent="clearSelection"
      >
        <span class="flex items-center gap-1">
          <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          {{ $t('clear_selection') }}
        </span>
      </div>
      <div
        v-for="item in filteredOptions"
        :key="item.key"
        class="cursor-pointer px-4 py-2 text-sm hover:bg-gray-100"
        :class="{ 'bg-gray-50 font-medium': modelValue === item.value }"
        @mousedown.prevent="selectOption(item)"
      >
        {{ item.label }}
      </div>
      <div v-if="filteredOptions.length === 0" class="px-4 py-2 text-sm text-gray-500">
        {{ noResultsText }}
      </div>
    </div>
  </div>
</template>
