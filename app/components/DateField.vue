<script setup lang="ts">
import { parseDate } from '@internationalized/date'
import type { CalendarDate, DateValue } from '@internationalized/date'
import type { DateRange } from 'reka-ui'

const props = withDefaults(defineProps<{
  modelValue: string | null
  clearable?: boolean
  placeholder?: string
  disabled?: boolean
}>(), {
  clearable: true,
  placeholder: 'Seleccionar fecha',
  disabled: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const open = ref(false)

const dateValue = computed<DateValue | undefined>(() => {
  if (!props.modelValue) return undefined
  try {
    return parseDate(props.modelValue.slice(0, 10))
  } catch {
    return undefined
  }
})

const display = computed(() => {
  if (!props.modelValue) return ''
  const parts = props.modelValue.slice(0, 10).split('-')
  if (parts.length !== 3) return props.modelValue
  return `${parts[2]}/${parts[1]}/${parts[0]}`
})

function onUpdate(val: DateValue | DateRange | DateValue[] | null | undefined) {
  if (val == null || Array.isArray(val) || (typeof val === 'object' && 'start' in val)) {
    emit('update:modelValue', '')
    return
  }
  const cd = val as CalendarDate
  const yyyy = String(cd.year).padStart(4, '0')
  const mm = String(cd.month).padStart(2, '0')
  const dd = String(cd.day).padStart(2, '0')
  emit('update:modelValue', `${yyyy}-${mm}-${dd}`)
  open.value = false
}

function clear() {
  emit('update:modelValue', '')
  open.value = false
}
</script>

<template>
  <UPopover v-model:open="open">
    <UButton
      :label="display || placeholder"
      :color="display ? 'neutral' : 'neutral'"
      variant="outline"
      icon="i-lucide-calendar"
      trailing-icon="i-lucide-chevron-down"
      :disabled="disabled"
      class="w-full justify-between font-normal"
    />
    <template #content>
      <div class="p-2 space-y-2">
        <UCalendar
          :model-value="dateValue"
          :week-starts-on="0"
          @update:model-value="onUpdate"
        />
        <div
          v-if="clearable && modelValue"
          class="flex justify-end pt-2 border-t border-default"
        >
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-lucide-x"
            @click="clear"
          >
            Limpiar
          </UButton>
        </div>
      </div>
    </template>
  </UPopover>
</template>
