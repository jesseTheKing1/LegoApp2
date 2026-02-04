export function getListData<T = any>(resData: any): T[] {
    if(!resData) return [];
    if (Array.isArray(resData)) return resData as T[];
    if (Array.isArray((resData as any).results)) return (resData as any).results as T[];
    return [];
}