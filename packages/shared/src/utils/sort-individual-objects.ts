import { type IndividualObject } from "@flixlix-cards/shared/states/raw/individual/get-individual-object";

export const sortIndividualObjects = (individualObjs: IndividualObject[]): IndividualObject[] => {
  const ranked = individualObjs.map((obj, index) => ({ obj, index }));
  ranked.sort((a, b) => {
    const stateDiff = (b.obj.state ?? 0) - (a.obj.state ?? 0);
    if (stateDiff !== 0) {
      return stateDiff;
    }

    const entityDiff = a.obj.entity.localeCompare(b.obj.entity);
    if (entityDiff !== 0) {
      return entityDiff;
    }

    return a.index - b.index;
  });
  return ranked.map(({ obj }) => obj);
};
