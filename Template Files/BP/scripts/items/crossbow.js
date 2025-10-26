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
          if (params.projectile_item) {
            if (!removeItem(source, params.projectile_item)) return;
          }
          const newItem = this.convertItem(item, params.loaded);
          mainhand.setItem(newItem);
          if (params.loaded_sound) this.playSound(source.dimension, source.location, params.loaded_sound);
          const id = source.id;
          this.loadedPlayers[id] = true;
          system.runTimeout(() => {
            delete this.loadedPlayers[id];
          }, 7);
        },
        onUse: (data2, arg) => {
          var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o;
          const { source } = data2;
          const mainhand = (_a = source.getComponent(EntityEquippableComponent.componentId)) == null ? void 0 : _a.getEquipmentSlot(EquipmentSlot.Mainhand);
          const item = mainhand == null ? void 0 : mainhand.getItem();
          if (!mainhand || !item) return;
          if (item.typeId !== ((_b = data2.itemStack) == null ? void 0 : _b.typeId)) return;
          const params = arg.params;
          if (item.typeId === params.loaded) {
            if (this.loadedPlayers[source.id]) return;
            const loc = source.getHeadLocation();
            const viewDir = source.getViewDirection();
            let amount = ((_c = params.projectile_amount) != null ? _c : 1) + ((_f = (_e = (_d = item.getComponent(ItemEnchantableComponent.componentId)) == null ? void 0 : _d.getEnchantment("multishot")) == null ? void 0 : _e.level) != null ? _f : 0) * ((_g = params.multishot) != null ? _g : 0);
            for (let i = 0; i < amount; i++) {
              const projectile = source.dimension.spawnEntity(params.projectile, { x: loc.x, y: 100, z: loc.z });
              projectile.teleport(loc);
              const comp = projectile.getComponent(EntityProjectileComponent.componentId);
              const angle = -((amount - 1) / 2 * ((_h = params.projectile_rotation) != null ? _h : 10)) + ((_i = params.projectile_rotation) != null ? _i : 10) * i;
              const radians = angle * (Math.PI / 180);
              if (params.projectile === `${namespace}:crossbow_arrow` && i !== Math.floor((amount - 1) / 2)) projectile.setDynamicProperty("no_pickup", true);
              let cosTheta = Math.cos(radians);
              let sinTheta = Math.sin(radians);
              const direction = {
                x: viewDir.x * cosTheta + viewDir.z * sinTheta,
                y: viewDir.y,
                z: -viewDir.x * sinTheta + viewDir.z * cosTheta
              };
              if (comp) {
                comp.owner = source;
                comp.shoot(Vector3Utils.multiply(direction, { x: (_j = params.power) != null ? _j : 1, y: (_k = params.power) != null ? _k : 1, z: (_l = params.power) != null ? _l : 1 }));
              } else projectile.applyImpulse(Vector3Utils.multiply(direction, { x: (_m = params.power) != null ? _m : 1, y: (_n = params.power) != null ? _n : 1, z: (_o = params.power) != null ? _o : 1 }));
              if (params.shoot_sound) this.playSound(source.dimension, source.location, params.shoot_sound);
              mainhand.setItem(this.decreaseItemDurability(source, this.convertItem(item, params.default), 1));
            }
          } else if (item.typeId === params.unusable) {
            if (params.projectile_item && !hasItem(source, params.projectile_item)) return;
            mainhand.setItem(this.convertItem(item, params.default));
          } else {
            if (params.projectile_item) {
              if (!hasItem(source, params.projectile_item)) {
                if (params.unusable) mainhand.setItem(this.convertItem(item, params.unusable));
                return;
              }
            }
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
        for (const arrow of player.dimension.getEntities({ location: player.location, maxDistance: 3, type: `${namespace}:crossbow_arrow` })) {
          if (!arrow || !arrow.isValid || !arrow.isOnGround) continue;
          if (!arrow.getDynamicProperty("no_pickup")) continue;
          arrow.remove();
        }
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
    world.afterEvents.itemReleaseUse.subscribe((data) => {
      var _a, _b, _c;
      const comp = (_b = (_a = data.itemStack) == null ? void 0 : _a.getComponent(`${namespace}:crossbow`)) == null ? void 0 : _b.customComponentParameters.params;
      if (!comp) return;
      if (((_c = data.itemStack) == null ? void 0 : _c.typeId) !== comp.loaded) return;
      delete this.loadedPlayers[data.source.id];
    });
  }
}
__publicField(CrossbowBehavior, "loadedPlayers", {});
__publicField(CrossbowBehavior, "animPlayers", {});
export {
  CrossbowBehavior
};
