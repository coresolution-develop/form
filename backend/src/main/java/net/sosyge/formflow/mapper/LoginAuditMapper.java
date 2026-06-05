package net.sosyge.formflow.mapper;

import net.sosyge.formflow.domain.LoginAudit;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface LoginAuditMapper {

    void insert(LoginAudit audit);
}
