revoke execute on function public.is_organization_member(uuid) from public;
revoke execute on function public.is_organization_member(uuid) from anon;
revoke execute on function public.is_organization_member(uuid) from authenticated;

revoke execute on function public.can_manage_organization(uuid) from public;
revoke execute on function public.can_manage_organization(uuid) from anon;
revoke execute on function public.can_manage_organization(uuid) from authenticated;
