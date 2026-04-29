<script setup lang="ts">
const props = defineProps<{ estado: string }>()

const colorMap: Record<string, string> = {
  'Recepcionado': 'neutral',
  'En proceso': 'info',
  'Finalizado en stock': 'success',
  'Entregado': 'primary'
}

type BadgeColor = 'neutral' | 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
const color = computed<BadgeColor>(() => (colorMap[props.estado] ?? 'neutral') as BadgeColor)
</script>

<template>
  <UBadge
    :color="color"
    variant="subtle"
  >
    {{ estado }}
  </UBadge>
</template>
