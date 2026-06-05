package net.sosyge.formflow.mapper;

import net.sosyge.formflow.domain.TermsAgreement;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface TermsAgreementMapper {

    void insertBatch(@Param("items") List<TermsAgreement> items);
}
