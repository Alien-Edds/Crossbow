var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { EntityEquippableComponent, EntityInventoryComponent, EntityProjectileComponent, EquipmentSlot, GameMode, ItemDurabilityComponent, ItemEnchantableComponent, ItemStack, system, world } from "@minecraft/server";
import { namespace } from ".././global";
import { Vector3Utils } from "../utils/vec3";
function removeItem(player, itemId) {
  var _a;
  if (!itemId.includes(":")) itemId = `minecraft:${itemId}`;
  if (player.getGameMode() !== GameMode.Creative) {
    let foundArrow = false;
    const equippable = player.getComponent(EntityEquippableComponent.componentId);
    if (!equippable) return false;
    for (const id in EquipmentSlot) {
      if (foundArrow) continue;
      const slot = equippable.getEquipmentSlot(id);
      const item = slot.getItem();
      if ((item == null ? void 0 : item.typeId) !== itemId) continue;
      foundArrow = true;
      if (item.amount - 1 > 0) {
        item.amount--;
        slot.setItem(item);
      } else slot.setItem(void 0);
    }
    if (!foundArrow) {
      const inv = (_a = player.getComponent(EntityInventoryComponent.componentId)) == null ? void 0 : _a.container;
      if (!inv) return false;
      for (let i = 0; i < inv.size; i++) {
        if (foundArrow) continue;
        const item = inv.getItem(i);
        if (!item || item.typeId !== itemId) continue;
        foundArrow = true;
        if (item.amount - 1 > 0) {
          item.amount--;
          inv.setItem(i, item);
        } else inv.setItem(i, void 0);
      }
    }
    return foundArrow;
  } else return true;
}
function hasItem(player, itemId) {
  var _a;
  if (!itemId.includes(":")) itemId = `minecraft:${itemId}`;
  if (player.getGameMode() !== GameMode.Creative) {
    let foundArrow = false;
    const equippable = player.getComponent(EntityEquippableComponent.componentId);
    if (!equippable) return false;
    for (const id in EquipmentSlot) {
      if (foundArrow) continue;
      const slot = equippable.getEquipmentSlot(id);
      const item = slot.getItem();
      if ((item == null ? void 0 : item.typeId) !== itemId) continue;
      foundArrow = true;
    }
    if (!foundArrow) {
      const inv = (_a = player.getComponent(EntityInventoryComponent.componentId)) == null ? void 0 : _a.container;
      if (!inv) return false;
      for (let i = 0; i < inv.size; i++) {
        if (foundArrow) continue;
        const item = inv.getItem(i);
        if (!item || item.typeId !== itemId) continue;
        foundArrow = true;
      }
    }
    return foundArrow;
  } else return true;
}
class CrossbowBehavior {
  static decreaseItemDurability(player, item, amount) {
    var _a;
    const gamemode = player.getGameMode();
    if (gamemode !== GameMode.Survival && gamemode !== GameMode.Adventure) return item;
    const comp = item.getComponent(ItemDurabilityComponent.componentId);
    if (!comp) return item;
    let chance = 0;
    const unbreaking = (_a = item.getComponent(ItemEnchantableComponent.componentId)) == null ? void 0 : _a.getEnchantment("unbreaking");
    if (unbreaking) chance = unbreaking.level * 0.25;
    if (chance > Math.random()) return item;
    if (comp.damage + amount > comp.maxDurability) {
      player.playSound("random.break");
      return void 0;
    }
    comp.damage += amount;
    return item;
  }
  static convertItem(from, to) {
    const newItem = new ItemStack(to, from.amount);
    const durComp = from.getComponent(ItemDurabilityComponent.componentId);
    if (durComp) {
      const newDur = newItem.getComponent(ItemDurabilityComponent.componentId);
      newDur.damage = durComp.damage;
    }
    const enchant = from.getComponent(ItemEnchantableComponent.componentId);
    const enchants = enchant == null ? void 0 : enchant.getEnchantments();
    if (enchants) {
      const newEnchant = newItem.getComponent(ItemEnchantableComponent.componentId);
      newEnchant.addEnchantments(enchants);
    }
    if (from.nameTag) newItem.nameTag = from.nameTag;
    const lore = from.getLore();
    if (lore) newItem.setLore(lore);
    return newItem;
  }
  static playSound(dimension, location, sound) {
    if (typeof sound === "string") {
      dimension.playSound(sound, location);
    } else dimension.playSound(sound.id, location, { volume: sound.volume, pitch: sound.pitch });
  }
  static initialize() {
    system.beforeEvents.startup.subscribe((data) => {
      data.itemComponentRegistry.registerCustomComponent(`${namespace}:crossbow`, {
        onCompleteUse: (data2, arg) => {
          var _a;
          const { source } = data2;
          const mainhand = (_a = source.getComponent(EntityEquippableComponent.componentId)) == null ? void 0 : _a.getEquipmentSlot(EquipmentSlot.Mainhand);
          const item = mainhand == null ? void 0 : mainhand.getItem();
          if (!mainhand || !item) return;
          if (item.typeId !== data2.itemStack.typeId) return;
          const params = arg.params;
          if (item.typeId === params.loaded) return;
          if (!removeItem(source, params.projectile_item)) return;
          const newItem = this.convertItem(item, params.loaded);
          mainhand.setItem(newItem);
          if (params.loaded_sound) this.playSound(source.dimension, source.location, params.loaded_sound);
          const id = source.id;
          this.loadedPlayers[id] = true;
          system.runTimeout(() => {
            delete this.loadedPlayers[id];
          }, 5);
        },
        onUse: (data2, arg) => {
          var _a, _b, _c, _d, _e, _f, _g, _h;
          const { source } = data2;
          const mainhand = (_a = source.getComponent(EntityEquippableComponent.componentId)) == null ? void 0 : _a.getEquipmentSlot(EquipmentSlot.Mainhand);
          const item = mainhand == null ? void 0 : mainhand.getItem();
          if (!mainhand || !item) return;
          if (item.typeId !== ((_b = data2.itemStack) == null ? void 0 : _b.typeId)) return;
          const params = arg.params;
          if (item.typeId === params.loaded) {
            if (this.loadedPlayers[source.id]) return;
            const loc = source.getHeadLocation();
            const projectile = source.dimension.spawnEntity(params.projectile, { x: loc.x, y: 100, z: loc.z });
            projectile.teleport(loc);
            const viewDir = source.getViewDirection();
            const comp = projectile.getComponent(EntityProjectileComponent.componentId);
            if (comp) {
              comp.owner = source;
              comp.shoot(Vector3Utils.multiply(viewDir, { x: (_c = params.power) != null ? _c : 1, y: (_d = params.power) != null ? _d : 1, z: (_e = params.power) != null ? _e : 1 }));
            } else projectile.applyImpulse(Vector3Utils.multiply(viewDir, { x: (_f = params.power) != null ? _f : 1, y: (_g = params.power) != null ? _g : 1, z: (_h = params.power) != null ? _h : 1 }));
            if (params.shoot_sound) this.playSound(source.dimension, source.location, params.shoot_sound);
            mainhand.setItem(this.decreaseItemDurability(source, this.convertItem(item, params.default), 1));
          } else if (hasItem(source, params.projectile_item)) {
            if (params.loading_sound) this.playSound(source.dimension, source.location, params.loading_sound);
            system.runTimeout(() => {
              if (params.loading_middle_sound) this.playSound(source.dimension, source.location, params.loading_middle_sound);
            }, 10);
          }
        }
      });
    });
    system.runInterval(() => {
      var _a, _b;
      for (const player of world.getAllPlayers()) {
        const mainhand = (_a = player.getComponent(EntityEquippableComponent.componentId)) == null ? void 0 : _a.getEquipmentSlot(EquipmentSlot.Mainhand);
        const item = mainhand == null ? void 0 : mainhand.getItem();
        if (!mainhand) continue;
        const params = (_b = item == null ? void 0 : item.getComponent(`${namespace}:crossbow`)) == null ? void 0 : _b.customComponentParameters.params;
        if (!params) {
          if (this.animPlayers[player.id]) {
            player.playAnimation(this.animPlayers[player.id], { blendOutTime: 0, stopExpression: "true" });
            delete this.animPlayers[player.id];
          }
          continue;
        }
        if (!item || item.typeId !== params.loaded) {
          if (this.animPlayers[player.id]) {
            player.playAnimation(this.animPlayers[player.id], { blendOutTime: 0, stopExpression: "true" });
            delete this.animPlayers[player.id];
          }
          continue;
        }
        if (!params.loaded_animation) continue;
        if (this.animPlayers[player.id] === params.loaded_animation) continue;
        player.playAnimation(params.loaded_animation, { blendOutTime: 999999 });
        this.animPlayers[player.id] = params.loaded_animation;
      }
    });
  }
}
__publicField(CrossbowBehavior, "loadedPlayers", {});
__publicField(CrossbowBehavior, "animPlayers", {});
export {
  CrossbowBehavior
};
