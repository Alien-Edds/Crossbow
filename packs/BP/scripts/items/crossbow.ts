import { Dimension, EntityEquippableComponent, EntityInventoryComponent, EntityProjectileComponent, EquipmentSlot, GameMode, ItemDurabilityComponent, ItemEnchantableComponent, ItemStack, Player, system, Vector3, world } from "@minecraft/server";
import { namespace } from ".././global";
import { Vector3Utils } from "../utils/vec3";

export interface CrossbowBehaviorParameters {
    default: string,
    loaded: string,
    unusable?: string,
    projectile: string,
    power?: number,
    projectile_item?: string,
    shoot_sound?: string | {
        id: string,
        volume?: number,
        pitch?: number
    },
    loaded_sound?: string | {
        id: string,
        volume?: number,
        pitch?: number
    },
    loading_sound?: string | {
        id: string,
        volume?: number,
        pitch?: number
    },
    loading_middle_sound?: string | {
        id: string,
        volume?: number,
        pitch?: number
    },
    loaded_animation?: string
}

function removeItem(player: Player, itemId: string): boolean {
    if (!itemId.includes(":")) itemId = `minecraft:${itemId}`
    if (player.getGameMode() !== GameMode.Creative) {
        let foundArrow = false
        const equippable = player.getComponent(EntityEquippableComponent.componentId)
        if (!equippable) return false
        for (const id in EquipmentSlot) {
            if (foundArrow) continue
            const slot = equippable.getEquipmentSlot(id as EquipmentSlot)
            const item = slot.getItem()
            if (item?.typeId !== itemId) continue
            foundArrow = true
            if ((item.amount - 1) > 0) {
                item.amount--
                slot.setItem(item)
            } else slot.setItem(undefined)
        }
        if (!foundArrow) {
            const inv = (player.getComponent(EntityInventoryComponent.componentId) as EntityInventoryComponent | undefined)?.container
            if (!inv) return false
            for (let i = 0; i < inv.size; i++) {
                if (foundArrow) continue
                const item = inv.getItem(i)
                if (!item || item.typeId !== itemId) continue
                foundArrow = true
                if ((item.amount - 1) > 0) {
                    item.amount--
                    inv.setItem(i, item)
                } else inv.setItem(i, undefined)
            }
        }
        return foundArrow
    } else return true
}

function hasItem(player: Player, itemId: string): boolean {
    if (!itemId.includes(":")) itemId = `minecraft:${itemId}`
    if (player.getGameMode() !== GameMode.Creative) {
        let foundArrow = false
        const equippable = player.getComponent(EntityEquippableComponent.componentId)
        if (!equippable) return false
        for (const id in EquipmentSlot) {
            if (foundArrow) continue
            const slot = equippable.getEquipmentSlot(id as EquipmentSlot)
            const item = slot.getItem()
            if (item?.typeId !== itemId) continue
            foundArrow = true
        }
        if (!foundArrow) {
            const inv = (player.getComponent(EntityInventoryComponent.componentId) as EntityInventoryComponent | undefined)?.container
            if (!inv) return false
            for (let i = 0; i < inv.size; i++) {
                if (foundArrow) continue
                const item = inv.getItem(i)
                if (!item || item.typeId !== itemId) continue
                foundArrow = true
            }
        }
        return foundArrow
    } else return true
}

export class CrossbowBehavior {
    static loadedPlayers: { [id: string]: boolean } = {}
    static animPlayers: { [id: string]: string } = {}
    static decreaseItemDurability(player: Player, item: ItemStack, amount: number): ItemStack | undefined {
        const gamemode = player.getGameMode()
        if (gamemode !== GameMode.Survival && gamemode !== GameMode.Adventure) return item
        const comp = item.getComponent(ItemDurabilityComponent.componentId) as ItemDurabilityComponent | undefined
        if (!comp) return item
        let chance = 0
        const unbreaking = (item.getComponent(ItemEnchantableComponent.componentId) as ItemEnchantableComponent | undefined)?.getEnchantment("unbreaking")
        if (unbreaking) chance = unbreaking.level * 0.25
        if (chance > Math.random()) return item
        if (comp.damage + amount > comp.maxDurability) {
            player.playSound("random.break")
            return undefined
        }
        comp.damage += amount
        return item
    }
    static convertItem(from: ItemStack, to: string): ItemStack {
        const newItem = new ItemStack(to, from.amount)
        const durComp = from.getComponent(ItemDurabilityComponent.componentId)
        if (durComp) {
            const newDur = newItem.getComponent(ItemDurabilityComponent.componentId) as ItemDurabilityComponent
            newDur.damage = durComp.damage
        }
        const enchant = from.getComponent(ItemEnchantableComponent.componentId)
        const enchants = enchant?.getEnchantments()
        if (enchants) {
            const newEnchant = newItem.getComponent(ItemEnchantableComponent.componentId) as ItemEnchantableComponent
            newEnchant.addEnchantments(enchants)
        }
        if (from.nameTag) newItem.nameTag = from.nameTag
        const lore = from.getLore()
        if (lore) newItem.setLore(lore)
        return newItem
    }
    static playSound(dimension: Dimension, location: Vector3, sound: string | { id: string, volume?: number, pitch?: number }) {
        if (typeof sound === "string") {
            dimension.playSound(sound, location)
        } else dimension.playSound(sound.id, location, { volume: sound.volume, pitch: sound.pitch })
    }
    static initialize() {
        system.beforeEvents.startup.subscribe((data) => {
            data.itemComponentRegistry.registerCustomComponent(`${namespace}:crossbow`, {
                onCompleteUse: (data, arg) => {
                    const { source } = data
                    const mainhand = source.getComponent(EntityEquippableComponent.componentId)?.getEquipmentSlot(EquipmentSlot.Mainhand)
                    const item = mainhand?.getItem()
                    if (!mainhand || !item) return
                    if (item.typeId !== data.itemStack.typeId) return
                    const params = arg.params as CrossbowBehaviorParameters
                    if (item.typeId === params.loaded) return
                    if (params.projectile_item) { if (!removeItem(source, params.projectile_item)) return }
                    const newItem = this.convertItem(item, params.loaded)
                    mainhand.setItem(newItem)
                    if (params.loaded_sound) this.playSound(source.dimension, source.location, params.loaded_sound)
                    const id = source.id
                    this.loadedPlayers[id] = true
                    system.runTimeout(() => {
                        delete this.loadedPlayers[id]
                    }, 7)
                },
                onUse: (data, arg) => {
                    const { source } = data
                    const mainhand = source.getComponent(EntityEquippableComponent.componentId)?.getEquipmentSlot(EquipmentSlot.Mainhand)
                    const item = mainhand?.getItem()
                    if (!mainhand || !item) return
                    if (item.typeId !== data.itemStack?.typeId) return
                    const params = arg.params as CrossbowBehaviorParameters
                    if (item.typeId === params.loaded) {
                        if (this.loadedPlayers[source.id]) return
                        const loc = source.getHeadLocation()
                        const projectile = source.dimension.spawnEntity(params.projectile, { x: loc.x, y: 100, z: loc.z })
                        projectile.teleport(loc)
                        const viewDir = source.getViewDirection()
                        const comp = projectile.getComponent(EntityProjectileComponent.componentId)
                        if (comp) {
                            comp.owner = source
                            comp.shoot(Vector3Utils.multiply(viewDir, { x: params.power ?? 1, y: params.power ?? 1, z: params.power ?? 1 }))
                        } else projectile.applyImpulse(Vector3Utils.multiply(viewDir, { x: params.power ?? 1, y: params.power ?? 1, z: params.power ?? 1 }))
                        if (params.shoot_sound) this.playSound(source.dimension, source.location, params.shoot_sound)
                        mainhand.setItem(this.decreaseItemDurability(source, this.convertItem(item, params.default), 1))
                    } else if (item.typeId === params.unusable) {
                        if (params.projectile_item && !hasItem(source, params.projectile_item)) return
                        mainhand.setItem(this.convertItem(item, params.default))
                    } else {
                        if (params.projectile_item) {
                            if (!hasItem(source, params.projectile_item)) {
                                if (params.unusable) mainhand.setItem(this.convertItem(item, params.unusable))
                                return
                            }
                        }
                        if (params.loading_sound) this.playSound(source.dimension, source.location, params.loading_sound)
                        system.runTimeout(() => {
                            if (params.loading_middle_sound) this.playSound(source.dimension, source.location, params.loading_middle_sound)
                        }, 10)
                    }
                }
            })
        })
        system.runInterval(() => {
            for (const player of world.getAllPlayers()) {
                const mainhand = player.getComponent(EntityEquippableComponent.componentId)?.getEquipmentSlot(EquipmentSlot.Mainhand)
                const item = mainhand?.getItem()
                if (!mainhand) continue
                const params = item?.getComponent(`${namespace}:crossbow`)?.customComponentParameters.params as CrossbowBehaviorParameters | undefined
                if (!params) {
                    if (this.animPlayers[player.id]) {
                        player.playAnimation(this.animPlayers[player.id], { blendOutTime: 0, stopExpression: "true" })
                        delete this.animPlayers[player.id]
                    }
                    continue
                }
                if (!item || item.typeId !== params.loaded) {
                    if (this.animPlayers[player.id]) {
                        player.playAnimation(this.animPlayers[player.id], { blendOutTime: 0, stopExpression: "true" })
                        delete this.animPlayers[player.id]
                    }
                    continue
                }
                if (!params.loaded_animation) continue
                if (this.animPlayers[player.id] === params.loaded_animation) continue
                player.playAnimation(params.loaded_animation, { blendOutTime: 999999 })
                this.animPlayers[player.id] = params.loaded_animation
            }
        })
        world.afterEvents.itemReleaseUse.subscribe((data) => {
            const comp = data.itemStack?.getComponent(`${namespace}:crossbow`)?.customComponentParameters.params as CrossbowBehaviorParameters | undefined
            if (!comp) return
            if (data.itemStack?.typeId !== comp.loaded) return
            delete this.loadedPlayers[data.source.id]
        })
    }
}